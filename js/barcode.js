/**
 * Barkod tarama işlemleri
 */
class BarcodeScanner {
    constructor() {
        this.codeReader = new ZXing.BrowserMultiFormatReader();
        this.isScanning = false;
        this.videoElement = document.getElementById('scanner-video');
        this.scannerContainer = document.getElementById('scanner-container');
    }

    /**
     * Kamera ile barkod taramayı başlatır
     * @returns {Promise} Promise nesnesi
     */
    startScanning() {
        if (this.isScanning) return Promise.resolve();
        
        this.scannerContainer.style.display = 'block';
        this.isScanning = true;
        
        return this.codeReader.decodeFromInputVideoDeviceContinuously(
            undefined, 
            this.videoElement,
            this.handleBarcodeResult.bind(this)
        )
        .catch(err => {
            console.error('Kamera erişim hatası:', err);
            alert('Kamera erişiminde sorun oluştu: ' + err.message);
            this.stopScanning();
            throw err;
        });
    }

    /**
     * Barkod tarama sonuçlarını işler
     * @param {Object|null} result Tarama sonucu
     */
    handleBarcodeResult(result) {
        if (result) {
            const barcode = result.getText();
            document.getElementById('barcodeInput').value = barcode;
            this.stopScanning();
            
            // Barkod bulundu eventi
            const event = new CustomEvent('barcodescanned', { 
                detail: { barcode } 
            });
            document.dispatchEvent(event);
        }
    }

    /**
     * Kamera ile barkod taramayı durdurur
     */
    stopScanning() {
        if (!this.isScanning) return;
        
        this.codeReader.reset();
        this.scannerContainer.style.display = 'none';
        this.isScanning = false;
    }

    /**
     * Manuel girilen barkodu işler
     * @param {string} barcode Barkod değeri
     * @returns {string|null} İşlenmiş barkod değeri
     */
    processManualBarcode(barcode) {
        if (!barcode || barcode.trim() === '') {
            return null;
        }
        
        // Boşlukları temizle
        barcode = barcode.trim();
        
        // Barkod formatını kontrol et ve düzelt (gerekirse)
        // Bu kısmı özelleştirebilirsiniz
        
        return barcode;
    }
}

// Global nesne
const barcodeScanner = new BarcodeScanner();