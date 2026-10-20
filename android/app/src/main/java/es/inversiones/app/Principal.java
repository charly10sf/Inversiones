package es.inversiones.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;

/** La app es la misma web de siempre (GitHub Pages) dentro de un WebView, con un puente para el widget. */
public class Principal extends Activity {
    static final String WEB = "https://charly10sf.github.io/Inversiones/";
    private static final int ELEGIR_ARCHIVO = 7;
    private static final int PERMISO_INSTALAR = 8;
    static final int ENTRAR_GOOGLE = 9;
    private static final int PERMISO_AVISOS = 10;
    private File pendiente;
    private WebView web;
    private ValueCallback<Uri[]> archivos;
    private String tokenPendiente;
    private boolean cargada;
    private View video;
    private WebChromeClient.CustomViewCallback cerrarVideo;

    @Override
    protected void onCreate(Bundle guardado) {
        super.onCreate(guardado);
        web = new WebView(this);
        web.setBackgroundColor(0xFF000000);
        web.setFitsSystemWindows(true);
        // sin la barra de desplazamiento del navegador a la derecha: en la app se desliza con el dedo
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(s.getUserAgentString() + " InversionesApp/" + BuildConfig.VERSION_CODE);
        CookieManager.getInstance().setAcceptCookie(true);

        web.addJavascriptInterface(new Puente(this), "InversionesApp");
        // los avisos, si los tienes activados (por si el sistema canceló el trabajo al actualizar la app)
        if (Avisos.activados(this)) Avisos.programar(this, true);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                cargada = true;
                guardarToken();
            }

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

            // vídeos a pantalla completa (el tráiler de GTA VI y cualquier vídeo de YouTube dentro de la web)
            @Override
            public void onShowCustomView(View v, CustomViewCallback cb) {
                if (video != null) { cb.onCustomViewHidden(); return; }
                video = v;
                cerrarVideo = cb;
                ((FrameLayout) getWindow().getDecorView()).addView(v, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                web.setVisibility(View.GONE);
            }

            @Override
            public void onHideCustomView() {
                salirVideo();
            }
        });
        web.setDownloadListener((url, agente, disposicion, tipo, largo) -> {
            if (url != null && url.startsWith("http")) abrirFuera(Uri.parse(url));
            else Toast.makeText(this, "Para descargar archivos, abre GrowFolio en Chrome", Toast.LENGTH_LONG).show();
        });

        tokenPendiente = token(getIntent());
        if (guardado != null) web.restoreState(guardado);
        else web.loadUrl(direccion(getIntent()));
    }

    /** Guarda el token que llega desde Chrome directamente en la web de la app y recarga, sin depender de la versión de la web */
    private void guardarToken() {
        if (tokenPendiente == null || tokenPendiente.isEmpty() || !cargada) return;
        String t = tokenPendiente;
        tokenPendiente = null;
        String js = "try{localStorage.setItem('inv-token'," + JSONObject.quote(JSONObject.quote(t)) + ");'ok'}catch(e){'no'}";
        web.evaluateJavascript(js, r -> {
            Toast.makeText(this, "\"ok\"".equals(r) ? "Token de GitHub guardado en la app" : "No se pudo guardar el token", Toast.LENGTH_LONG).show();
            if ("\"ok\"".equals(r)) web.loadUrl(WEB + "#cartera");
        });
    }

    /** El token de GitHub, si llega desde Chrome: como extra o en el enlace inversiones://token?t=... */
    private static String token(Intent i) {
        if (i == null) return null;
        String t = i.getStringExtra("t");
        Uri d = i.getData();
        if ((t == null || t.isEmpty()) && d != null && "inversiones".equals(d.getScheme())) t = d.getQueryParameter("t");
        return t;
    }

    /** El widget abre la app en una sección concreta (#ruta, #cartera...) */
    private String direccion(Intent i) {
        String h = i != null ? i.getStringExtra("hash") : null;
        return h != null && !h.isEmpty() ? WEB + "#" + h : WEB;
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        String t = token(i);
        if (t != null && !t.isEmpty()) {
            tokenPendiente = t;
            guardarToken();
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

    /** Ejecuta algo en la web desde cualquier hilo */
    void js(String codigo) {
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript(codigo, null); });
    }

    /** Cuenta a la web cómo va la descarga de la versión nueva (-1 si falla) */
    void progreso(int pct, String estado) {
        String js = "window.progresoApp && progresoApp(" + pct + "," + JSONObject.quote(estado == null ? "" : estado) + ")";
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript(js, null); });
    }

    /** Abre el instalador de Android con el APK descargado; la primera vez pide permiso para instalar desde la app */
    void instalar(File f) {
        if (f == null || !f.exists()) {
            progreso(-1, "no hay nada descargado");
            return;
        }
        if (!getPackageManager().canRequestPackageInstalls()) {
            pendiente = f;
            progreso(100, "permiso");
            try {
                startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())), PERMISO_INSTALAR);
            } catch (Exception e) {
                progreso(-1, "no se pudo abrir el permiso");
            }
            return;
        }
        Intent i = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(Archivos.uri(), "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(i);
        } catch (Exception e) {
            progreso(-1, "no se pudo abrir el instalador");
        }
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent datos) {
        if (pedido == ENTRAR_GOOGLE) {
            // vuelta del selector de cuentas de Google: el token va a la web, que lo cambia por la sesión de Firebase
            try {
                com.google.android.gms.auth.api.signin.GoogleSignInAccount c = com.google.android.gms.auth.api.signin.GoogleSignIn
                        .getSignedInAccountFromIntent(datos).getResult(com.google.android.gms.common.api.ApiException.class);
                String token = c != null ? c.getIdToken() : null;
                js(token != null ? "window.resultadoGoogle && window.resultadoGoogle(true, " + JSONObject.quote(token) + ")"
                        : "window.resultadoGoogle && window.resultadoGoogle(false, 'sin token')");
            } catch (com.google.android.gms.common.api.ApiException e) {
                int c = e.getStatusCode();
                js("window.resultadoGoogle && window.resultadoGoogle(false, " + JSONObject.quote((c == 12501 ? "CANCELADO " : "codigo ") + c) + ")");
            } catch (Exception e) {
                js("window.resultadoGoogle && window.resultadoGoogle(false, " + JSONObject.quote(String.valueOf(e)) + ")");
            }
            return;
        }
        if (pedido == PERMISO_INSTALAR) {
            File f = pendiente;
            pendiente = null;
            if (f != null && getPackageManager().canRequestPackageInstalls()) instalar(f);
            else progreso(100, "permiso");
            return;
        }
        if (pedido == ELEGIR_ARCHIVO && archivos != null) {
            archivos.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultado, datos));
            archivos = null;
            return;
        }
        super.onActivityResult(pedido, resultado, datos);
    }

    /** Android 13 o más: el permiso de notificaciones, solo cuando activas los avisos */
    void pedirPermisoAvisos() {
        if (android.os.Build.VERSION.SDK_INT >= 33) requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, PERMISO_AVISOS);
    }

    @Override
    public void onRequestPermissionsResult(int pedido, String[] permisos, int[] resultados) {
        if (pedido == PERMISO_AVISOS) {
            boolean ok = resultados.length > 0 && resultados[0] == android.content.pm.PackageManager.PERMISSION_GRANTED;
            js("window.permisoAvisos && permisoAvisos(" + ok + ")");
            return;
        }
        super.onRequestPermissionsResult(pedido, permisos, resultados);
    }

    private void salirVideo() {
        if (video == null) return;
        ((FrameLayout) getWindow().getDecorView()).removeView(video);
        video = null;
        web.setVisibility(View.VISIBLE);
        if (cerrarVideo != null) cerrarVideo.onCustomViewHidden();
        cerrarVideo = null;
    }

    @Override
    public void onBackPressed() {
        if (video != null) salirVideo();
        else if (web.canGoBack()) web.goBack();
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
