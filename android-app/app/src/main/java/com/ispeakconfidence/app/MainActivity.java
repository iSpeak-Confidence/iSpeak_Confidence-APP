package com.ispeakconfidence.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final String HOME = "https://ispeakconfidence.com/";
    private WebView webView;
    private PermissionRequest pendingWebPermission;
    private ValueCallback<Uri[]> fileCallback;

    private static final int REQ_PERMISSIONS = 1001;
    private static final int REQ_FILE = 1002;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this); setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false); s.setAllowContentAccess(true); s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u=req.getUrl(); String host=u.getHost();
                if ("https".equals(u.getScheme()) && ("ispeakconfidence.com".equals(host) || (host!=null && host.endsWith(".ispeakconfidence.com")))) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW,u)); } catch(Exception ignored) {}
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!HOME.startsWith(request.getOrigin().toString())) { request.deny(); return; }
                    pendingWebPermission=request; List<String> need=new ArrayList<>();
                    for(String r:request.getResources()) {
                        if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)&&checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED) need.add(Manifest.permission.CAMERA);
                        if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)&&checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED) need.add(Manifest.permission.RECORD_AUDIO);
                    }
                    if(need.isEmpty()) request.grant(request.getResources()); else requestPermissions(need.toArray(new String[0]), REQ_PERMISSIONS);
                });
            }
            @Override public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if(fileCallback!=null) fileCallback.onReceiveValue(null); fileCallback=cb;
                try { startActivityForResult(p.createIntent(), REQ_FILE); return true; } catch(Exception e) { fileCallback=null; return false; }
            }
        });
        webView.setDownloadListener((url,userAgent,contentDisposition,mimeType,contentLength) -> {
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch(Exception ignored) {}
        });
        if(savedInstanceState==null) webView.loadUrl(HOME); else webView.restoreState(savedInstanceState);
    }
    @Override protected void onSaveInstanceState(Bundle out){webView.saveState(out);super.onSaveInstanceState(out);}
    @Override public void onBackPressed(){ if(webView!=null && webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults){
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if(requestCode!=REQ_PERMISSIONS || pendingWebPermission==null) return;
        List<String> granted=new ArrayList<>();
        for(String r:pendingWebPermission.getResources()){
            if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)&&checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)granted.add(r);
            if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)&&checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)granted.add(r);
        }
        if(granted.isEmpty())pendingWebPermission.deny();else pendingWebPermission.grant(granted.toArray(new String[0]));
        pendingWebPermission=null;
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode!=REQ_FILE||fileCallback==null)return;
        Uri[] uris=null;
        if(resultCode==RESULT_OK&&data!=null){
            if(data.getClipData()!=null){uris=new Uri[data.getClipData().getItemCount()];for(int i=0;i<uris.length;i++)uris[i]=data.getClipData().getItemAt(i).getUri();}
            else if(data.getData()!=null)uris=new Uri[]{data.getData()};
        }
        fileCallback.onReceiveValue(uris);fileCallback=null;
    }
    @Override protected void onDestroy(){if(webView!=null){webView.destroy();webView=null;}super.onDestroy();}
}
