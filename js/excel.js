class ExcelManager {
    constructor() {
        this.mappedHeaders = {};
        this.requiredFields = [
            "Barkod", "Ürün Kodu", "Marka", "Ürün Kodu 2", "Renk", 
            "Beden", "Üretim Yeri", "Tarih", "Para Birimi", "Fiyat", 
            "Açıklama", "Kategori"
        ];

        // Otomatik eşleştirmeyi desteklemek için şu ilişkileri kurun:
        this.fieldMappings = {
            "Barkod": ["Barcode - EAN", "barcode", "barkod", "ean"],
            "Ürün Kodu": ["Product code", "product code", "ürün kodu"],
            "Marka": ["Product description", "product description", "marka"],
            "Ürün Kodu 2": ["Color Code", "color code", "renk kodu"],
            "Renk": ["Color description in Turkish", "color", "renk"],
            "Beden": ["Size", "size", "beden"],
            "Üretim Yeri": ["Country of production", "country", "ülke"],
            "Tarih": ["Last price change date", "date", "tarih"],
            "Para Birimi": ["TL"], // Sabit değer
            "Fiyat": ["Price in Turkish Lira inc.VAT", "price", "fiyat"],
            "Açıklama": ["KDV DAHİLDİR"], // Sabit değer
            "Kategori": ["Collection Code", "collection", "category", "kategori"]
        };
        
        this.excelData = [];
    }

    /**
     * Excel dosyasını yükler ve parse eder
     */
    loadExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                try {
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // İlk çalışma sayfasını al
                    const firstSheet = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheet];
                    
                    // JSON'a dönüştür
                    this.excelData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                    
                    if (this.excelData.length === 0) {
                        reject("Excel dosyası boş veya veri içermiyor.");
                        return;
                    }
                    
                    console.log("Excel verisi yüklendi. İlk satır örneği:", this.excelData[0]);
                    
                    // Manuel eşleştirme kullan
                    this.mapHeadersManually();
                    
                    resolve({
                        rowCount: this.excelData.length,
                        headers: Object.keys(this.excelData[0])
                    });
                } catch (error) {
                    console.error("Excel yükleme hatası:", error);
                    reject(`Excel dosyası yüklenirken hata oluştu: ${error.message}`);
                }
            };
            
            reader.onerror = () => {
                reject('Dosya okuma hatası.');
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Manuel eşleştirme fonksiyonu - her zaman doğru sütunları kullanalım
     */
    mapHeadersManually() {
        if (!this.excelData || this.excelData.length === 0) return;
        
        const sampleRow = this.excelData[0];
        const excelHeaders = Object.keys(sampleRow);
        
        console.log("Excel dosyasındaki sütunlar:", excelHeaders);
        
        // Manuel eşleştirme yapılandırması
        const manualMapping = {
            "Barkod": "Barcode - EAN",
            "Ürün Kodu": "Product code",
            "Marka": "Product description",
            "Ürün Kodu 2": "Color Code",
            "Renk": "Color description in Turkish",
            "Beden": "Size",
            "Üretim Yeri": "Country of production",
            "Tarih": "Last price change date",
            "Para Birimi": "TL", // Sabit değer
            "Fiyat": "Price in Turkish Lira inc.VAT",
            "Açıklama": "KDV DAHİLDİR", // Sabit değer
            "Kategori": "Collection Code"
        };
        
        this.mappedHeaders = {};
        
        // Her gerekli alan için manuel eşleştirme uygula
        this.requiredFields.forEach(reqField => {
            const mappedHeader = manualMapping[reqField];
            
            // Excel'de bu sütun var mı kontrol et
            if (mappedHeader && excelHeaders.includes(mappedHeader)) {
                this.mappedHeaders[reqField] = mappedHeader;
                console.log(`✅ '${reqField}' manuel olarak eşleştirildi: '${mappedHeader}'`);
            } 
            // Sabit değerler için özel işlem
            else if (reqField === 'Para Birimi' || reqField === 'Açıklama') {
                // Bu alanlar sabit değerdir, eşleştirme yapmıyoruz
                console.log(`ℹ️ '${reqField}' sabit değer kullanılacak`);
            } 
            else if (mappedHeader) {
                console.warn(`❌ '${reqField}' için eşleşmesi gereken '${mappedHeader}' sütunu Excel'de bulunamadı.`);
                
                // En yakın eşleşmeyi bulmaya çalış
                const possibleMatch = excelHeaders.find(h => 
                    h.toLowerCase().includes(mappedHeader.toLowerCase()) || 
                    mappedHeader.toLowerCase().includes(h.toLowerCase())
                );
                
                if (possibleMatch) {
                    this.mappedHeaders[reqField] = possibleMatch;
                    console.log(`🔄 '${reqField}' için alternatif eşleşme kullanıldı: '${possibleMatch}'`);
                }
            } 
            else {
                console.warn(`❌ '${reqField}' için manuel eşleştirme tanımlanmadı.`);
            }
        });
        
        console.log("Manuel eşleştirilmiş başlıklar:", this.mappedHeaders);
    }
    
    /**
     * Sütun başlıklarını otomatik eşleştirir
     */
    mapHeaders() {
        if (!this.excelData || this.excelData.length === 0) return;
        
        const sampleRow = this.excelData[0];
        const excelHeaders = Object.keys(sampleRow);
        
        this.mappedHeaders = {};
        
        // Her bir gerekli alanı eşleştirmeye çalış
        this.requiredFields.forEach(reqField => {
            // Tam eşleşme kontrol et
            let match = excelHeaders.find(h => h === reqField);
            
            // Eğer tam eşleşme yoksa, olası alternatif isimler kontrol et
            if (!match && this.fieldMappings[reqField]) {
                match = excelHeaders.find(h => {
                    return this.fieldMappings[reqField].some(alt => {
                        const result = h.toLowerCase().includes(alt.toLowerCase());
                        return result;
                    });
                });
            }
            
            if (match) {
                this.mappedHeaders[reqField] = match;
            }
        });
    }
    
    /**
     * Tüm Excel verisini döndürür
     */
    getAllData() {
        return this.excelData || [];
    }
    
    /**
     * Excel verisine erişim fonksiyonu
     */
    getExcelData() {
        return this.excelData || [];
    }
    
    /**
     * Eşleştirilmiş başlıkları alma
     */
    getMappedHeaders() {
        return this.mappedHeaders || {};
    }
    
    /**
     * Barkod ile ürün arama
     */
    findProductByBarcode(barcode) {
        if (!this.excelData || !barcode) return null;
        
        const barcodeField = this.mappedHeaders['Barkod'];
        if (!barcodeField) return null;
        
        return this.excelData.find(row => {
            const rowBarcode = String(row[barcodeField] || '').trim();
            return rowBarcode === barcode;
        });
    }
    
    /**
     * Ürün verilerini etiket formatına dönüştürür
     */
    formatDataForLabel(product) {
        if (!product) return null;
        
        const labelData = {};
        
        // Her başlık için değeri ekle
        for (const [requiredField, mappedField] of Object.entries(this.mappedHeaders)) {
            if (mappedField) {
                labelData[requiredField] = product[mappedField] || '';
            }
        }
        
        // Sabit değerleri ekle
        if (!this.mappedHeaders['Para Birimi']) labelData['Para Birimi'] = 'TL';
        if (!this.mappedHeaders['Açıklama']) labelData['Açıklama'] = 'KDV DAHİLDİR';
        
        return labelData;
    }
}

// Global nesne
const excelManager = new ExcelManager();