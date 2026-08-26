package com.ispeakconfidence.app;

import android.Manifest;
import android.app.Activity;
import android.media.projection.MediaProjectionManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.content.res.Configuration;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String HOME = "https://ispeakconfidence.com/";
    private WebView webView;
    private PermissionRequest pendingWebPermission;
    private ValueCallback<Uri[]> fileCallback;
    private TextToSpeech textToSpeech;
    private MediaPlayer mediaPlayer;
    private boolean ttsReady=false;
    private String pendingSpeech="";
    private String pendingLang="en-US";

    private static final int REQ_PERMISSIONS = 1001;
    private static final int REQ_FILE = 1002;
    private static final int REQ_SCREEN_CAPTURE = 1003;
    private String pendingScreenBooking="";
    private String pendingScreenAuth="";

    private class AndroidAudioBridge {
        @JavascriptInterface public void speak(String text, String languageTag) {
            final String safeText=text==null?"":text.trim();
            final String safeLang=(languageTag==null||languageTag.trim().isEmpty())?"en-US":languageTag.trim();
            if(safeText.isEmpty())return;
            runOnUiThread(() -> speakNative(safeText,safeLang,0.9f));
        }
        @JavascriptInterface public void speakWithRate(String text, String languageTag, float rate) {
            final String safeText=text==null?"":text.trim();
            final String safeLang=(languageTag==null||languageTag.trim().isEmpty())?"en-US":languageTag.trim();
            final float safeRate=Math.max(0.5f,Math.min(1.5f,rate));
            if(safeText.isEmpty())return;
            runOnUiThread(() -> speakNative(safeText,safeLang,safeRate));
        }
        @JavascriptInterface public void playAudioUrl(String url) {
            final String safeUrl=url==null?"":url.trim();
            if(safeUrl.isEmpty())return;
            runOnUiThread(() -> playNativeAudioUrl(safeUrl,"","en-US"));
        }
        @JavascriptInterface public void playAudioUrlWithFallback(String url, String fallbackText, String languageTag) {
            final String safeUrl=url==null?"":url.trim();
            final String safeText=fallbackText==null?"":fallbackText.trim();
            final String safeLang=(languageTag==null||languageTag.trim().isEmpty())?"en-US":languageTag.trim();
            if(safeUrl.isEmpty()){ if(!safeText.isEmpty())runOnUiThread(() -> speakNative(safeText,safeLang,0.9f)); return; }
            runOnUiThread(() -> playNativeAudioUrl(safeUrl,safeText,safeLang));
        }
        @JavascriptInterface public void openExternalUrl(String url) {
            final String safeUrl=url==null?"":url.trim();
            if(safeUrl.isEmpty())return;
            runOnUiThread(() -> { try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(safeUrl))); } catch(Exception ignored) {} });
        }
        @JavascriptInterface public void startScreenShare(String bookingId, String authToken) {
            final String b=bookingId==null?"":bookingId.trim(), t=authToken==null?"":authToken.trim(); if(b.isEmpty()||t.isEmpty())return;
            runOnUiThread(() -> { pendingScreenBooking=b; pendingScreenAuth=t; try { MediaProjectionManager m=(MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE); startActivityForResult(m.createScreenCaptureIntent(),REQ_SCREEN_CAPTURE); } catch(Exception e){ notifyScreenState("error"); } });
        }
        @JavascriptInterface public void stopScreenShare() { runOnUiThread(() -> { try{Intent i=new Intent(MainActivity.this,ScreenShareService.class);i.setAction(ScreenShareService.ACTION_STOP);startService(i);}catch(Exception ignored){} notifyScreenState("stopped"); }); }
        @JavascriptInterface public boolean isReady() { return ttsReady; }
        @JavascriptInterface public void stop() {
            runOnUiThread(() -> { if(textToSpeech!=null) textToSpeech.stop(); stopNativeAudio(); });
        }
    }


    private void notifyScreenState(String state){ if(webView!=null)webView.post(() -> webView.evaluateJavascript("window.__ispeakNativeScreenShareState&&window.__ispeakNativeScreenShareState(\""+state+"\")",null)); }

    private void stopNativeAudio(){
        if(mediaPlayer!=null){
            try{mediaPlayer.stop();}catch(Exception ignored){}
            try{mediaPlayer.release();}catch(Exception ignored){}
            mediaPlayer=null;
        }
    }

    private void playNativeAudioUrl(String url,String fallbackText,String languageTag){
        stopNativeAudio();
        try{
            mediaPlayer=new MediaPlayer();
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            mediaPlayer.setDataSource(url);
            mediaPlayer.setOnPreparedListener(mp -> mp.start());
            mediaPlayer.setOnCompletionListener(mp -> stopNativeAudio());
            mediaPlayer.setOnErrorListener((mp,what,extra) -> { stopNativeAudio(); if(fallbackText!=null&&!fallbackText.isEmpty())speakNative(fallbackText,languageTag,0.9f); return true; });
            mediaPlayer.prepareAsync();
        }catch(Exception e){ stopNativeAudio(); if(fallbackText!=null&&!fallbackText.isEmpty())speakNative(fallbackText,languageTag,0.9f); }
    }

    private void speakNative(String text,String languageTag,float rate){
        if(textToSpeech==null||!ttsReady){pendingSpeech=text;pendingLang=languageTag;return;}
        Locale locale=Locale.forLanguageTag(languageTag);
        int result=textToSpeech.setLanguage(locale);
        if(result==TextToSpeech.LANG_MISSING_DATA||result==TextToSpeech.LANG_NOT_SUPPORTED){
            // Keep the installed/default engine language rather than silently doing nothing.
            textToSpeech.setLanguage(Locale.getDefault());
        }
        textToSpeech.setSpeechRate(rate);
        textToSpeech.speak(text,TextToSpeech.QUEUE_FLUSH,null,"ispeak-learning-audio");
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        textToSpeech=new TextToSpeech(this,status->{
            ttsReady=status==TextToSpeech.SUCCESS;
            if(ttsReady&&!pendingSpeech.isEmpty()){
                String text=pendingSpeech,lang=pendingLang;pendingSpeech="";speakNative(text,lang,0.9f);
            }
        });
        webView = new WebView(this); setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false); s.setAllowContentAccess(true); s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString()+" iSpeakAndroid/18.8.69");
        CookieManager cookies=CookieManager.getInstance(); cookies.setAcceptCookie(true); cookies.setAcceptThirdPartyCookies(webView,true);
        webView.addJavascriptInterface(new AndroidAudioBridge(),"iSpeakAndroid");
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
    @Override public void onConfigurationChanged(Configuration newConfig){super.onConfigurationChanged(newConfig);if(webView!=null)webView.post(() -> webView.requestLayout());}
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
        if(requestCode==REQ_SCREEN_CAPTURE){
            if(resultCode!=RESULT_OK||data==null){notifyScreenState("cancelled");return;}
            try{Intent svc=new Intent(this,ScreenShareService.class);svc.setAction(ScreenShareService.ACTION_START);svc.putExtra("bookingId",pendingScreenBooking);svc.putExtra("authToken",pendingScreenAuth);svc.putExtra("resultCode",resultCode);svc.putExtra("projectionData",data);if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O)startForegroundService(svc);else startService(svc);notifyScreenState("started");}catch(Exception e){notifyScreenState("error");}
            return;
        }
        if(requestCode!=REQ_FILE||fileCallback==null)return;
        Uri[] uris=null;
        if(resultCode==RESULT_OK&&data!=null){
            if(data.getClipData()!=null){uris=new Uri[data.getClipData().getItemCount()];for(int i=0;i<uris.length;i++)uris[i]=data.getClipData().getItemAt(i).getUri();}
            else if(data.getData()!=null)uris=new Uri[]{data.getData()};
        }
        fileCallback.onReceiveValue(uris);fileCallback=null;
    }
    @Override protected void onDestroy(){stopNativeAudio();if(textToSpeech!=null){textToSpeech.stop();textToSpeech.shutdown();textToSpeech=null;}if(webView!=null){webView.destroy();webView=null;}super.onDestroy();}
}
