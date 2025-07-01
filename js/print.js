/**
 * Etiket yazdırma ve önizleme işlemleri
 */
class LabelPrinter {
    constructor() {
        this.currentLabelData = null;
        this.labelPreviewElement = document.getElementById('label-preview');
        this.printLabelButton = document.getElementById('printLabel');
    }

    /**
     * Excel tarih değerini düzgün formatlı tarih string'ine çevirir
     * @param {any} excelDate Excel'den alınan tarih değeri
     * @returns {string} Formatlanmış tarih (gg/aa/yyyy)
     */
    formatExcelDate(excelDate) {
        try {
            // Eğer boş ya da geçersiz bir değerse boş string döndür
            if (!excelDate) return '';
            
            // Excel tarih sayısı: 1 Ocak 1900'den itibaren geçen gün sayısı
            // Ancak Excel'de 1900'ün bir artık yıl olduğu varsayılır (aslında değildir)
            // Bu nedenle 60'dan büyük değerler için 1 gün düzeltme yapılır
            
            // Önce sayıya çevir
            let dateValue = Number(excelDate);
            
            // Sayı değilse veya geçersizse, orijinal değeri döndür
            if (isNaN(dateValue) || dateValue < 0) {
                // Belki düz metin olarak tarih girilmiştir
                return String(excelDate);
            }
            
            // Excel bug düzeltmesi (1900'ün artık yıl olmaması)
            if (dateValue > 60) {
                dateValue -= 1;
            }
            
            // Excel başlangıç tarihi: 1 Ocak 1900
            const baseDate = new Date(1900, 0, 1);
            
            // Excel gün sayısını JavaScript tarihine çevir
            const jsDate = new Date(baseDate);
            jsDate.setDate(baseDate.getDate() + dateValue - 1);
            
            // Tarih formatını dd/mm/yyyy olarak ayarla
            const day = String(jsDate.getDate()).padStart(2, '0');
            const month = String(jsDate.getMonth() + 1).padStart(2, '0');
            const year = jsDate.getFullYear();
            
            return `${day}/${month}/${year}`;
        } catch (e) {
            console.error("Tarih formatlarken hata:", e);
            // Hata durumunda orijinal değeri döndür
            return String(excelDate || '');
        }
    }
    
    /**
     * Fiyatı düzgün formatlı para birimine çevirir
     * @param {any} price Fiyat değeri
     * @returns {string} Formatlanmış fiyat
     */
    formatPrice(price) {
        try {
            // Önce sayıya çevirmeyi deneyelim
            const cleanPrice = String(price).replace(/[^\d.,]/g, '')
                                          .replace(',', '.');
            
            const numPrice = parseFloat(cleanPrice);
            
            // Geçerli bir sayı değilse, orijinal değeri döndür
            if (isNaN(numPrice)) return String(price || '');
            
            // Türkçe para birimi formatı: 1.234,56
            return new Intl.NumberFormat('tr-TR', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(numPrice);
        } catch (e) {
            console.error("Fiyat formatlarken hata:", e);
            // Hata durumunda orijinal değeri döndür
            return String(price || '');
        }
    }

    /**
     * Etiket önizlemesini hazırlar
     * @param {Object} labelData Etiket verileri
     */
    updateLabelPreview(labelData) {
        if (!labelData) {
            this.showEmptyPreview();
            return;
        }
        
        this.currentLabelData = labelData;
        
        // Barkod verisini string'e dönüştür
        const barkodDeger = String(labelData['Barkod'] || "");
        
        // Tarihi formatla
        const rawDate = labelData['Tarih'] || '';
        const formattedDate = this.formatExcelDate(rawDate);
        
        // Fiyatı formatla
        const rawPrice = labelData['Fiyat'] || '';
        const formattedPrice = this.formatPrice(rawPrice);
        
        // Font boyutu sınıfını belirle
        const fontSize = document.getElementById('fontSize').value;
        const fontSizeClass = `font-size-${fontSize}`;
        
        // Etiket içeriğini oluştur - Fiyat ve TL yeniden düzenlendi
        let labelHTML = `
            <div class="label-content ${fontSizeClass}">
                <div class="label-product-code">${labelData['Ürün Kodu'] || ''}</div>
                <div class="label-brand">${labelData['Marka'] || ''}</div>
                <div class="label-product-code2">${labelData['Ürün Kodu 2'] || ''}</div>
                <div class="label-color">${labelData['Renk'] || ''}</div>
                <div class="label-size">${labelData['Beden'] || ''}</div>
                <div class="label-category">${labelData['Kategori'] || ''}</div>
                <div class="label-production">ÜRETİM YERİ</div>
                <div class="label-barcode-container">
                    <svg class="barcode"></svg>
                </div>
                <div class="label-barcode-text">${barkodDeger}</div>
                <div class="label-date">${formattedDate}</div>
                <div class="label-price-currency">TL</div>
                <div class="label-price-amount">${formattedPrice}</div>
                <div class="label-note">KDV DAHİLDİR</div>
            </div>
        `;
        
        this.labelPreviewElement.innerHTML = labelHTML;
        
        // Barkod oluştur
        if (barkodDeger) {
            try {
                JsBarcode(this.labelPreviewElement.querySelector('.barcode'), 
                    barkodDeger, {
                        format: "CODE128",
                        width: 1.5,
                        height: 20, // 16'dan 20'ye arttırıldı
                        displayValue: false,
                        margin: 0,
                        lineColor: "#000"
                    }
                );
            } catch (error) {
                console.error("Barkod oluşturma hatası:", error);
                // Barkod oluşturulamazsa hata gösterme
                this.labelPreviewElement.querySelector('.barcode').innerHTML = 
                    `<text x="50%" y="50%" text-anchor="middle" dy=".3em">Barkod Hatası</text>`;
            }
        }
        
        // Yazdırma butonunu aktifleştir
        this.printLabelButton.disabled = false;
    }

    /**
     * Boş etiket önizlemesi gösterir
     */
    showEmptyPreview() {
        this.currentLabelData = null;
        this.labelPreviewElement.innerHTML = `
            <div class="empty-label-message">
                <i class="fas fa-tag fa-3x mb-2"></i>
                <p>Etiket önizlemesi için barkod okutun veya tablodaki bir ürünü seçin</p>
            </div>
        `;
        this.printLabelButton.disabled = true;
    }

    /**
     * Etiketi yazdırır
     */
    printLabel() {
        if (!this.currentLabelData) {
            alert('Yazdırılacak etiket bulunamadı.');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Lütfen popup pencerelere izin verin ve tekrar deneyin.');
            return;
        }
        
        // Etiket boyutlarını al
        const width = document.getElementById('labelWidth').value || 40;
        const height = document.getElementById('labelHeight').value || 40;
        const fontSize = document.getElementById('fontSize').value;
        
        const labelData = this.currentLabelData;
        
        // Verileri formatla
        const barkodDeger = String(labelData['Barkod'] || "");
        const formattedDate = this.formatExcelDate(labelData['Tarih'] || '');
        const formattedPrice = this.formatPrice(labelData['Fiyat'] || '');
        
        // HTML içeriği oluştur - Fiyat konumu değiştirildi
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Etiket Yazdırma</title>
                <style>
                    @page {
                        size: ${width}mm ${height}mm;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        width: ${width}mm;
                        height: ${height}mm;
                        font-family: Arial, sans-serif;
                    }
                    .label-container {
                        width: 100%;
                        height: 100%;
                        position: relative;
                        box-sizing: border-box;
                        background-color: white;
                    }
                    
                    /* Ürün Kodu - Sol üst */
                    .label-product-code {
                        position: absolute;
                        top: 2mm;
                        left: 2mm;
                        font-size: 7pt;
                        font-weight: bold;
                        line-height: 1;
                    }
                    
                    /* Marka - 2. satır */
                    .label-brand {
                        position: absolute;
                        top: 5mm;
                        left: 2mm;
                        font-size: 7pt;
                        font-weight: bold;
                        line-height: 1;
                    }
                    
                    /* Ürün Kodu 2 - 3. satır */
                    .label-product-code2 {
                        position: absolute;
                        top: 8mm;
                        left: 2mm;
                        font-size: 7pt;
                        line-height: 1;
                    }
                    
                    /* Renk - 4. satır */
                    .label-color {
                        position: absolute;
                        top: 11mm;
                        left: 2mm;
                        font-size: 7pt;
                        line-height: 1;
                    }
                    
                    /* Beden - Büyük numara sol alt */
                    .label-size {
                        position: absolute;
                        top: 14mm;
                        left: 2mm;
                        font-size: 14pt;
                        font-weight: bold;
                        line-height: 1;
                    }
                    
                    /* Kategori - Sağ üst köşe */
                    .label-category {
                        position: absolute;
                        top: 8mm;
                        right: 2mm;
                        text-align: right;
                        font-size: 8pt;
                        font-weight: bold;
                        line-height: 1;
                    }
                    
                    /* Üretim Yeri */
                    .label-production {
                        position: absolute;
                        top: 17mm;
                        right: 8mm;
                        font-size: 6pt;
                        line-height: 1;
                        text-align: right;
                    }
                    
                    /* Barkod Container - yükseklik arttırıldı */
                    .label-barcode-container {
                        position: absolute;
                        bottom: 13mm;
                        left: 2mm;
                        width: 36mm;
                        height: 10mm; /* 8mm'den 10mm'ye arttırıldı */
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    
                    /* Barkod SVG - yükseklik arttırıldı */
                    .label-barcode-container svg {
                        max-width: 36mm;
                        height: 18mm; /* 15mm'den 18mm'ye arttırıldı */
                    }
                    
                    /* Barkod Metni - barkoda daha yakın */
                    .label-barcode-text {
                        position: absolute;
                        bottom: 12mm;
                        left: 2mm;
                        width: 36mm;
                        text-align: center;
                        font-size: 6pt;
                        font-weight: bold;
                        line-height: 1;
                        letter-spacing: 2pt; /* Harfler arası boşluk azaltıldı */
                    }
                    
                    /* Tarih - Sağ tarafta */
                    .label-date {
                        position: absolute;
                        bottom: 7mm;
                        right: 2mm;
                        font-size: 6pt;
                        line-height: 1;
                        text-align: right;
                    }
                    
                    /* Para Birimi (TL) - Düzeltildi */
                    .label-price-currency {
                        position: absolute;
                        bottom: 4mm;
                        left: 2mm;
                        font-size: 8pt;
                        font-weight: bold;
                        line-height: 1;
                    }
                    
                    /* Fiyat Tutarı - Düzeltildi */
                    .label-price-amount {
                        position: absolute;
                        bottom: 4mm;
                        left: 9mm;
                        font-size: 8pt;
                        font-weight: bold;
                        line-height: 1;
                    }
                    
                    /* KDV notu - TL'nin altına taşındı */
                    .label-note {
                        position: absolute;
                        bottom: 2mm;
                        left: 2mm;
                        font-size: 5pt;
                        line-height: 1;
                    }
                </style>
                <script src="https://unpkg.com/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            </head>
            <body>
                <div class="label-container">
                    <div class="label-product-code">${labelData['Ürün Kodu'] || ''}</div>
                    <div class="label-brand">${labelData['Marka'] || ''}</div>
                    <div class="label-product-code2">${labelData['Ürün Kodu 2'] || ''}</div>
                    <div class="label-color">${labelData['Renk'] || ''}</div>
                    <div class="label-size">${labelData['Beden'] || ''}</div>
                    <div class="label-category">${labelData['Kategori'] || ''}</div>
                    <div class="label-production">ÜRETİM YERİ</div>
                    <div class="label-barcode-container">
                        <svg class="barcode"></svg>
                    </div>
                    <div class="label-barcode-text">${barkodDeger}</div>
                    <div class="label-date">${formattedDate}</div>
                    <div class="label-price-currency">TL</div>
                    <div class="label-price-amount">${formattedPrice}</div>
                    <div class="label-note">KDV DAHİLDİR</div>
                </div>
                <script>
                    try {
                        JsBarcode(".barcode", "${barkodDeger}", {
                            format: "CODE128",
                            width: 1.5,
                            height: 18, // 15'den 18'e arttırıldı
                            displayValue: false,
                            margin: 0,
                            lineColor: "#000"
                        });
                        document.fonts.ready.then(() => {
                            setTimeout(() => { window.print(); window.close(); }, 300);
                        });
                    } catch (error) {
                        console.error("Barkod oluşturma hatası:", error);
                        document.querySelector('.barcode').innerHTML = 
                            '<text x="50%" y="50%" text-anchor="middle" dy=".3em">Barkod Hatası</text>';
                        document.fonts.ready.then(() => {
                            setTimeout(() => { window.print(); window.close(); }, 300);
                        });
                    }
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
    }
}

// Global nesne
const labelPrinter = new LabelPrinter();