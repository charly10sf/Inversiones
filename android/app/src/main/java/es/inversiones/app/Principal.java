package es.inversiones.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/** La app es la misma web de siempre (GitHub Pages) dentro de un WebView, con un puente para el widget. */
public class Principal extends Activity {
    static final String WEB = "https://charly10sf.github.io/Inversiones/";
    private static final int ELEGIR_ARCHIVO = 7;
    private WebView web;
    private ValueCallback<Uri[]> archivos;

    @Override
    protected void onCreate(Bundle guardado) {
        super.onCreate(guardado);
        web = new WebView(this);
        web.setBackgroundColor(0xFF12110F);
        web.setFitsSystemWindows(true);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(s.getUserAgentString() + " InversionesApp/" + BuildConfig.VERSION_CODE);
        CookieManager.getInstance().setAcceptCookie(true);

        web.addJavascriptInterface(new Puente(this), "InversionesApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (esDeLaWeb(u)) return false;
                abrirFuera(u);
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (archivos != null) archivos.onReceiveValue(null);
                archivos = cb;
                try {
                    startActivityForResult(p.createIntent(), ELEGIR_ARCHIVO);
                } catch (Exception e) {
                    archivos = null;
                    return false;
                }
                return true;
            }
        });
        web.setDownloadListener((url, agente, disposicion, tipo, largo) -> {
            if (url != null && url.startsWith("http")) abrirFuera(Uri.parse(url));
            else Toast.makeText(this, "Para descargar archivos, abre la web en Chrome", Toast.LENGTH_LONG).show();
        });

        if (guardado != null) web.restoreState(guardado);
        else web.loadUrl(direccion(getIntent()));
    }

    /** El widget abre la app en una sección concreta (#ruta, #cartera...) */
    /** El token de GitHub, si llega desde Chrome: como extra o en el enlace inversiones://token?t=... */
    private static String token(Intent i) {
        if (i == null) return null;
        String t = i.getStringExtra("t");
        Uri d = i.getData();
        if ((t == null || t.isEmpty()) && d != null && "inversiones".equals(d.getScheme())) t = d.getQueryParameter("t");
        return t;
    }

    private String direccion(Intent i) {
        String t = token(i);
        if (t != null && !t.isEmpty()) return WEB + "#t=" + Uri.encode(t);  // el token de GitHub, pasado desde Chrome
        String h = i != null ? i.getStringExtra("hash") : null;
        return h != null && !h.isEmpty() ? WEB + "#" + h : WEB;
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        String t = token(i);
        if (t != null && !t.isEmpty()) {
            web.loadUrl(direccion(i));
            return;
        }
        String h = i != null ? i.getStringExtra("hash") : null;
        if (h != null && !h.isEmpty()) web.evaluateJavascript("location.hash = '" + h.replaceAll("[^a-z]", "") + "'", null);
    }

    private static boolean esDeLaWeb(Uri u) {
        return "charly10sf.github.io".equalsIgnoreCase(u.getHost()) && u.getPath() != null && u.getPath().toLowerCase().startsWith("/inversiones");
    }

    private void abrirFuera(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception e) {
            Toast.makeText(this, "No se puede abrir " + u, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent datos) {
        if (pedido == ELEGIR_ARCHIVO && archivos != null) {
            archivos.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultado, datos));
            archivos = null;
            return;
        }
        super.onActivityResult(pedido, resultado, datos);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle salida) {
        super.onSaveInstanceState(salida);
        web.saveState(salida);
    }

    @Override
    protected void onPause() {
        // la web manda al widget lo último antes de quedarse en segundo plano
        web.evaluateJavascript("window.enviarWidget && enviarWidget(true)", null);
        web.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }
}
