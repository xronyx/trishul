/**
 * Android SSL Pinning Bypass Script
 * 
 * This Frida script attempts to bypass various SSL certificate pinning implementations
 * in Android applications by hooking common methods used for certificate validation.
 */

setTimeout(function() {
    Java.perform(function() {
        console.log("[+] Android SSL Pinning Bypass Script Loaded");
        
        // TrustManager (Android < 7)
        var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
        var SSLContext = Java.use('javax.net.ssl.SSLContext');
        
        // TrustManager bypass
        try {
            var TrustManager = Java.registerClass({
                name: 'com.android.insecurebankv2.bypass.TrustManager',
                implements: [X509TrustManager],
                methods: {
                    checkClientTrusted: function(chain, authType) {},
                    checkServerTrusted: function(chain, authType) {},
                    getAcceptedIssuers: function() { return []; }
                }
            });
            
            // Create a new TrustManager array with our own implementation
            var TrustManagers = [TrustManager.$new()];
            
            // Get the default SSLContext
            var SSLContext_init = SSLContext.init.overload(
                '[Ljavax.net.ssl.KeyManager;', '[Ljavax.net.ssl.TrustManager;', 'java.security.SecureRandom'
            );
            
            // Override the init method to use our custom TrustManager
            SSLContext_init.implementation = function(keyManager, trustManager, secureRandom) {
                console.log("[+] Bypassing Trustmanager (Android < 7) request");
                SSLContext_init.call(this, keyManager, TrustManagers, secureRandom);
            };
            
            console.log("[+] TrustManager bypassed");
        } catch (err) {
            console.log("[-] TrustManager bypass failed");
            console.log(err);
        }
        
        // OkHTTP 3 CertificatePinner
        try {
            var CertificatePinner = Java.use('okhttp3.CertificatePinner');
            
            CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function(hostname, certificateChain) {
                console.log("[+] OkHTTP 3: Bypassing certificate pinning for: " + hostname);
                return;
            };
            
            console.log("[+] OkHTTP 3 CertificatePinner bypassed");
        } catch (err) {
            console.log("[-] OkHTTP 3 CertificatePinner bypass failed");
        }
        
        // Trustkit
        try {
            var TrustKit = Java.use('com.datatheorem.android.trustkit.pinning.OkHostnameVerifier');
            
            TrustKit.verify.overload('java.lang.String', 'javax.net.ssl.SSLSession').implementation = function(hostname, session) {
                console.log("[+] TrustKit: Bypassing certificate pinning for: " + hostname);
                return true;
            };
            
            console.log("[+] Trustkit bypassed");
        } catch (err) {
            console.log("[-] Trustkit bypass failed");
        }
        
        // Android 7+ WebView check
        try {
            var WebViewClient = Java.use('android.webkit.WebViewClient');
            
            WebViewClient.onReceivedSslError.overload('android.webkit.WebView', 'android.webkit.SslErrorHandler', 'android.net.http.SslError').implementation = function(webView, handler, error) {
                console.log("[+] WebViewClient: Bypassing SSL error");
                handler.proceed();
                return;
            };
            
            console.log("[+] WebViewClient SSL validation bypassed");
        } catch (err) {
            console.log("[-] WebViewClient bypass failed");
        }
        
        console.log("[+] SSL Pinning Bypass Completed");
    });
}, 0); 