/**
 * Ana uygulama kodu
 */
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elementleri
    const loadExcelBtn = document.getElementById('loadExcel');
    const excelFileInput = document.getElementById('excelFile');
    const excelInfoDiv = document.getElementById('excelInfo');
    const dataTableBody = document.getElementById('dataTableBody');
    const barcodeInput = document.getElementById('barcodeInput');
    const scanBarcodeBtn = document.getElementById('scanBarcode');
    const stopScannerBtn = document.getElementById('stopScanner');
    const searchBarcodeBtn = document.getElementById('searchBarcode');
    const printLabelBtn = document.getElementById('printLabel');
    const fontSizeSelect = document.getElementById('fontSize');
    
    // Excel dosyası yükleme
    loadExcelBtn.addEventListener('click', function() {
        if (!excelFileInput.files.length) {
            alert('Lütfen bir Excel dosyası seçin.');
            return;
        }
        
        const file = excelFileInput.files[0];
        excelInfoDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Yükleniyor...`;
        excelInfoDiv.style.display = 'block';
        
        excelManager.loadExcelFile(file)
            .then(result => {
                excelInfoDiv.innerHTML = `
                    <strong>Excel dosyası yüklendi!</strong><br>
                    Veri sayısı: ${result.rowCount}<br>
                    Sütunlar: ${result.headers.join(', ')}
                `;
                updateDataTable();
            })
            .catch(error => {
                excelInfoDiv.innerHTML = `<div class="text-danger"><i class="fas fa-exclamation-triangle"></i> ${error}</div>`;
            });
    });
    
    // Barkod tarama başlatma
    scanBarcodeBtn.addEventListener('click', function() {
        barcodeScanner.startScanning()
            .catch(err => console.error('Tarama başlatılamadı:', err));
    });
    
    // Barkod tarama durdurma
    stopScannerBtn.addEventListener('click', function() {
        barcodeScanner.stopScanning();
    });
    
    // Barkod arama
    searchBarcodeBtn.addEventListener('click', function() {
        searchBarcode();
    });
    
    // Enter tuşuyla barkod arama
    barcodeInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            searchBarcode();
        }
    });
    
    // Barkod tarandığında
    document.addEventListener('barcodescanned', function(event) {
        const barcode = event.detail.barcode;
        searchBarcode(barcode);
    });
    
    // Etiket yazdırma
    printLabelBtn.addEventListener('click', function() {
        labelPrinter.printLabel();
    });
    
    // Font boyutu değişince önizlemeyi güncelle
    fontSizeSelect.addEventListener('change', function() {
        if (labelPrinter.currentLabelData) {
            labelPrinter.updateLabelPreview(labelPrinter.currentLabelData);
        }
    });
    
    /**
     * Barkod arama fonksiyonu
     * @param {string|null} barcode Aranacak barkod (verilmezse input'tan alınır)
     */
    function searchBarcode(barcode = null) {
        if (!barcode) {
            barcode = barcodeInput.value.trim();
        }
        
        if (!barcode) {
            alert('Lütfen bir barkod girin veya okutun.');
            return;
        }
        
        const processedBarcode = barcodeScanner.processManualBarcode(barcode);
        if (!processedBarcode) {
            alert('Geçersiz barkod.');
            return;
        }
        
        // Excel verileri yüklü değilse
        if (excelManager.getAllData().length === 0) {
            alert('Önce Excel verilerini yükleyin.');
            return;
        }
        
        const product = excelManager.findProductByBarcode(processedBarcode);
        if (!product) {
            alert(`Barkod ${processedBarcode} bulunamadı.`);
            return;
        }
        
        // Etiket için verileri formatla
        const labelData = excelManager.formatDataForLabel(product);
        
        // Etiket önizlemesini güncelle
        labelPrinter.updateLabelPreview(labelData);
        
        // Tabloda ilgili ürünü vurgula
        highlightTableRow(processedBarcode);
    }
    
    /**
     * Veri tablosunu günceller
     */
    function updateDataTable() {
        const data = excelManager.getAllData();
        if (!data.length) {
            dataTableBody.innerHTML = `<tr><td colspan="5" class="text-center">Veri yok</td></tr>`;
            return;
        }
        
        const headers = excelManager.getMappedHeaders();
        const barcodeField = headers["Barkod"] ? excelManager.mappedHeaders["Barkod"] : null;
        const brandField = headers["Marka"] ? excelManager.mappedHeaders["Marka"] : null;
        const colorField = headers["Renk"] ? excelManager.mappedHeaders["Renk"] : null;
        const sizeField = headers["Beden"] ? excelManager.mappedHeaders["Beden"] : null;
        
        console.log("Tablo için kullanılacak alanlar:", {
            barcodeField, brandField, colorField, sizeField
        });
        
        let tableHTML = '';
        
        data.forEach((row, index) => {
            const barcode = barcodeField ? (row[barcodeField] || '') : '';
            const brand = brandField ? (row[brandField] || '') : '';
            const color = colorField ? (row[colorField] || '') : '';
            const size = sizeField ? (row[sizeField] || '') : '';
            
            tableHTML += `
                <tr data-barcode="${barcode}">
                    <td>${barcode}</td>
                    <td>${brand}</td>
                    <td>${color}</td>
                    <td>${size}</td>
                    <td>
                        <button class="btn btn-sm btn-primary select-product" data-index="${index}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        dataTableBody.innerHTML = tableHTML;
        
        // Ürün seçme butonları için event ekle
        document.querySelectorAll('.select-product').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                previewEtiketFromRow(index);
                
                // Tabloda seçili satırı vurgula
                document.querySelectorAll('#dataTableBody tr').forEach(row => {
                    row.classList.remove('table-primary');
                });
                this.closest('tr').classList.add('table-primary');
            });
        });
    }
    
    /**
     * Tablodaki ilgili satırı vurgular
     * @param {string} barcode Vurgulanacak ürünün barkodu
     */
    function highlightTableRow(barcode) {
        document.querySelectorAll('#dataTableBody tr').forEach(row => {
            row.classList.remove('table-primary');
            if (row.dataset.barcode === barcode) {
                row.classList.add('table-primary');
                // Satırı görünür alana kaydır
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }
    
    /**
     * Satırdaki verilerden etiket önizlemesi oluşturur
     * @param {number} rowIndex Seçilen satırın indeksi
     */
    function previewEtiketFromRow(rowIndex) {
        const data = excelManager.getExcelData();
        if (!data || !data[rowIndex]) {
            console.error("Seçilen satır için veri bulunamadı");
            return;
        }
        
        const row = data[rowIndex];
        console.log("Seçilen satır verisi:", row);
        
        // Etiket verisini oluştur
        const labelData = {};
        const headers = excelManager.getMappedHeaders();
        
        console.log("Kullanılacak eşleştirilmiş başlıklar:", headers);
        
        // Her başlık için değeri ekle
        for (const [requiredField, mappedField] of Object.entries(headers)) {
            if (mappedField) {
                labelData[requiredField] = row[mappedField] || '';
                
                // Fiyat alanını özellikle kontrol et
                if (requiredField === 'Fiyat') {
                    console.log(`Fiyat değeri kontrol: '${labelData[requiredField]}', kaynak alan: '${mappedField}'`);
                    console.log(`Ham veri: ${typeof row[mappedField]}, değeri: ${row[mappedField]}`);
                }
            }
        }
        
        // Sabit değerleri ekle
        if (!headers['Para Birimi']) labelData['Para Birimi'] = 'TL';
        if (!headers['Açıklama']) labelData['Açıklama'] = 'KDV DAHİLDİR';
        
        // Zorunlu alanları kontrol et
        if (!labelData['Barkod']) {
            alert('Barkod bilgisi bulunamadı!');
            return;
        }
        
        console.log("Etiket verisi oluşturuldu:", labelData);
        
        // Etiket önizlemesini güncelle
        labelPrinter.updateLabelPreview(labelData);
    }
});