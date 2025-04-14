/**
 * Android API Tracer
 * 
 * This Frida script traces common Android API calls that might be interesting
 * from a security perspective. It will log method calls with their parameters
 * and return values.
 */

Java.perform(function() {
    console.log("[+] Android API Tracer Loaded");
    
    // Trace crypto operations
    traceClass("javax.crypto.Cipher");
    traceClass("java.security.MessageDigest");
    traceClass("javax.crypto.Mac");
    
    // Trace shared preferences
    traceClass("android.content.SharedPreferences$Editor");
    traceClass("android.content.SharedPreferences");
    
    // Trace SQL database operations
    traceClass("android.database.sqlite.SQLiteDatabase");
    
    // Trace network operations
    traceClass("java.net.URL");
    traceClass("okhttp3.OkHttpClient");
    traceClass("com.android.volley.RequestQueue");
    
    // Trace file operations
    traceClass("java.io.File");
    traceClass("java.io.FileInputStream");
    traceClass("java.io.FileOutputStream");
    
    // Trace clipboard
    traceClass("android.content.ClipboardManager");
    
    console.log("[+] Tracing setup completed");
});

// Function to trace all methods in a class
function traceClass(targetClass) {
    try {
        var hook = Java.use(targetClass);
        var methods = hook.class.getDeclaredMethods();
        
        console.log("[+] Tracing class: " + targetClass);
        console.log("[+] Found " + methods.length + " methods to trace");
        
        methods.forEach(function(method) {
            var methodName = method.getName();
            
            // Skip toString, hashCode and other common methods
            if (methodName === 'toString' || methodName === 'hashCode' || 
                methodName === 'wait' || methodName === 'equals' ||
                methodName === 'notify' || methodName === 'notifyAll' ||
                methodName === 'getClass') {
                return;
            }
            
            // Get method overloads
            try {
                var overloadCount = hook[methodName].overloads.length;
                
                // Loop through all overloads
                for (var i = 0; i < overloadCount; i++) {
                    hook[methodName].overloads[i].implementation = function() {
                        console.log("[+] Called: " + targetClass + "." + methodName);
                        
                        // Print arguments
                        if (arguments.length > 0) {
                            console.log("[+] Arguments:");
                            for (var j = 0; j < arguments.length; j++) {
                                var arg = arguments[j];
                                if (arg != null) {
                                    if (typeof arg === 'object') {
                                        console.log("\t Arg[" + j + "]: " + arg.toString());
                                    } else {
                                        console.log("\t Arg[" + j + "]: " + arg);
                                    }
                                } else {
                                    console.log("\t Arg[" + j + "]: null");
                                }
                            }
                        }
                        
                        // Call the original method and get result
                        var retval;
                        try {
                            retval = this[methodName].apply(this, arguments);
                            if (retval != null) {
                                if (typeof retval === 'object') {
                                    console.log("[+] Return value: " + retval.toString());
                                } else {
                                    console.log("[+] Return value: " + retval);
                                }
                            } else {
                                console.log("[+] Return value: null");
                            }
                            return retval;
                        } catch (err) {
                            console.log("[!] Exception: " + err);
                            throw err;
                        }
                    };
                }
            } catch (err) {
                console.log("[!] Error hooking method: " + methodName + " - " + err);
            }
        });
    } catch (err) {
        console.log("[!] Error tracing class: " + targetClass + " - " + err);
    }
} 