package com.example.groceryapp;

import android.Manifest;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;
    private TextView statusText;
    private Button grantButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        statusText = findViewById(R.id.status_text);
        grantButton = findViewById(R.id.grant_permissions_button);

        grantButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                checkAndRequestPermissions();
            }
        });

        // Initial check
        updateStatus();
        
        // Auto-request on first open if not granted
        if (!allPermissionsGranted()) {
            checkAndRequestPermissions();
        }
    }

    /**
     * Returns the list of permissions required based on the Android version.
     */
    private String[] getRequiredPermissions() {
        List<String> permissions = new ArrayList<>();
        
        // Location is required for all versions (API 23+)
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
        permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+ (API 33+)
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES);
            permissions.add(Manifest.permission.READ_MEDIA_VIDEO);
            permissions.add(Manifest.permission.READ_MEDIA_AUDIO);
        } else {
            // Android 6 to 12 (API 23 to 32)
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
                // WRITE_EXTERNAL_STORAGE is deprecated in API 30+ (Android 11+)
                permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }
        }

        return permissions.toArray(new String[0]);
    }

    /**
     * Checks if all required permissions are granted.
     */
    private boolean allPermissionsGranted() {
        for (String permission : getRequiredPermissions()) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    /**
     * Checks and requests permissions, showing rationale if necessary.
     */
    private void checkAndRequestPermissions() {
        String[] permissions = getRequiredPermissions();
        List<String> listPermissionsNeeded = new ArrayList<>();

        for (String p : permissions) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                listPermissionsNeeded.add(p);
            }
        }

        if (!listPermissionsNeeded.isEmpty()) {
            // Check if we should show rationale
            boolean showRationale = false;
            for (String p : listPermissionsNeeded) {
                if (ActivityCompat.shouldShowRequestPermissionRationale(this, p)) {
                    showRationale = true;
                    break;
                }
            }

            if (showRationale) {
                showRationaleDialog(listPermissionsNeeded);
            } else {
                ActivityCompat.requestPermissions(this, listPermissionsNeeded.toArray(new String[0]), PERMISSION_REQUEST_CODE);
            }
        } else {
            updateStatus();
            Toast.makeText(this, "All permissions already granted!", Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * Shows a dialog explaining why permissions are needed.
     */
    private void showRationaleDialog(final List<String> permissions) {
        new AlertDialog.Builder(this)
                .setTitle("Permissions Required")
                .setMessage("This app requires Location and Storage permissions to function correctly. Please grant them to continue.")
                .setPositiveButton("Grant", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        ActivityCompat.requestPermissions(MainActivity.this, permissions.toArray(new String[0]), PERMISSION_REQUEST_CODE);
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    /**
     * Shows a dialog when permissions are permanently denied, redirecting to settings.
     */
    private void showSettingsDialog() {
        new AlertDialog.Builder(this)
                .setTitle("Permissions Permanently Denied")
                .setMessage("You have permanently denied some required permissions. Please enable them in the app settings to use all features.")
                .setPositiveButton("Go to Settings", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        openAppSettings();
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    /**
     * Opens the system app settings screen.
     */
    private void openAppSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        Uri uri = Uri.fromParts("package", getPackageName(), null);
        intent.setData(uri);
        startActivity(intent);
    }

    private void updateStatus() {
        if (allPermissionsGranted()) {
            statusText.setText("Permission Status: ALL GRANTED");
            statusText.setTextColor(ContextCompat.getColor(this, android.R.color.holo_green_dark));
            grantButton.setEnabled(false);
            grantButton.setText("Permissions Granted");
        } else {
            statusText.setText("Permission Status: DENIED / PENDING");
            statusText.setTextColor(ContextCompat.getColor(this, android.R.color.holo_red_dark));
            grantButton.setEnabled(true);
            grantButton.setText("Grant Permissions");
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean someDenied = false;
            boolean permanentlyDenied = false;

            for (int i = 0; i < grantResults.length; i++) {
                if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
                    someDenied = true;
                    // Check if permanently denied
                    if (!ActivityCompat.shouldShowRequestPermissionRationale(this, permissions[i])) {
                        permanentlyDenied = true;
                    }
                }
            }

            if (!someDenied) {
                Toast.makeText(this, "Permissions Granted!", Toast.LENGTH_SHORT).show();
            } else if (permanentlyDenied) {
                showSettingsDialog();
            } else {
                Toast.makeText(this, "Permissions Denied", Toast.LENGTH_SHORT).show();
            }
            
            updateStatus();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Update status when returning from settings
        updateStatus();
    }
}
