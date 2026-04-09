package com.example.groceryapp;

import android.Manifest;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private static final int PERMISSION_REQUEST_CODE = 100;
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        setupWebView();

        // Check and request permissions on app start
        checkAndRequestPermissions();
    }

    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setGeolocationEnabled(true);
        webSettings.setDomStorageEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                // This handles geolocation requests from the WebView
                callback.invoke(origin, true, false);
            }
        });

        // Load your grocery app URL
        webView.loadUrl("https://ais-dev-vvnkyfkghaxtpfq3fsvknb-6194796437.asia-southeast1.run.app");
    }

    private void checkAndRequestPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();
        
        // Location for finding stores
        addPermissionIfNotGranted(permissionsNeeded, Manifest.permission.ACCESS_FINE_LOCATION);
        addPermissionIfNotGranted(permissionsNeeded, Manifest.permission.ACCESS_COARSE_LOCATION);
        
        // Contacts for sharing lists
        addPermissionIfNotGranted(permissionsNeeded, Manifest.permission.READ_CONTACTS);
        
        // Camera for scanning barcodes
        addPermissionIfNotGranted(permissionsNeeded, Manifest.permission.CAMERA);
        
        // Phone for calling support
        addPermissionIfNotGranted(permissionsNeeded, Manifest.permission.CALL_PHONE);

        // Storage/Photos for profile and receipts
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            addPermissionIfNotGranted(permissionsNeeded, Manifest.permission.READ_MEDIA_IMAGES);
        } else {
            addPermissionIfNotGranted(permissionsNeeded, Manifest.permission.READ_EXTERNAL_STORAGE);
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
                addPermissionIfNotGranted(permissionsNeeded, Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }
        }

        if (!permissionsNeeded.isEmpty()) {
            // Show explanation if needed
            boolean shouldShowRationale = false;
            for (String permission : permissionsNeeded) {
                if (ActivityCompat.shouldShowRequestPermissionRationale(this, permission)) {
                    shouldShowRationale = true;
                    break;
                }
            }

            if (shouldShowRationale) {
                showExplanationDialog(permissionsNeeded);
            } else {
                ActivityCompat.requestPermissions(this, permissionsNeeded.toArray(new String[0]), PERMISSION_REQUEST_CODE);
            }
        }
    }

    private void addPermissionIfNotGranted(List<String> list, String permission) {
        if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
            list.add(permission);
        }
    }

    private void showExplanationDialog(final List<String> permissions) {
        new AlertDialog.Builder(this)
                .setTitle("Permissions Required")
                .setMessage("Our Grocery App needs these permissions to help you find nearby stores, scan product barcodes, share lists with friends, and call support directly. Would you like to grant them now?")
                .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        ActivityCompat.requestPermissions(MainActivity.this, permissions.toArray(new String[0]), PERMISSION_REQUEST_CODE);
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            if (allGranted) {
                Toast.makeText(this, "All permissions are granted", Toast.LENGTH_LONG).show();
                webView.reload();
            } else {
                Toast.makeText(this, "Some permissions were denied. You can enable them in Settings for full functionality.", Toast.LENGTH_LONG).show();
            }
        }
    }
}
