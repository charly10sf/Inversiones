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
    static String WEB = "https://charly10sf.github.io/Inversiones/";
    /** si la estás mirando: la actualización sola espera a que no la uses (instalar encima la cierra) */
    static volatile boolean enPantalla;
    private static final int ELEGIR_ARCHIVO = 7;
    private static final int PERMISO_INSTALAR = 8;
    static final int ENTRAR_GOOGLE = 9;
    private static final int PERMISO_AVISOS = 10;
    private static final int DICTAR = 11;
    private File pendiente;
    private WebView web;
    private ValueCallback<Uri[]> archivos;
    private String tokenPendiente;
    private boolean cargada;
    // 0.4: tocar «Actualizar» en el aviso del móvil: en cuanto la web está lista, empieza a bajar la app nueva
    private boolean actualizarAlCargar;
    private View video;
    private WebChromeClient.CustomViewCallback cerrarVideo;
    private boolean enBanco;      // dando permiso al banco dentro de la app
    private boolean traspaso;     // se le ha pasado el permiso a la app del banco
    private String agenteMovil;   // el user agent de siempre, para volver a él al acabar

    @Override
    protected void onCreate(Bundle guardado) {
        super.onCreate(guardado);
        WEB = Datos.web(this);
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
        // el aviso de las versiones nuevas (viene encendido; se quita en Ajustes de la web)
        Versiones.programar(this);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                cargada = true;
                guardarToken();
                if (actualizarAlCargar) {
                    actualizarAlCargar = false;
                    lanzarActualizacion();
                }
            }

            @Override
            public void onPageStarted(WebView v, String url, android.graphics.Bitmap icono) {
                // de vuelta en GrowFolio (también con «atrás» a medio permiso): otra vez como móvil
                if (enBanco && url != null && esDeLaWeb(Uri.parse(url))) salirDelBanco();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                String esquema = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
                if (esDeLaWeb(u)) {
                    if (!enBanco) return false;
                    salirDelBanco();   // el banco ha terminado y devuelve el código a GrowFolio
                    v.loadUrl(u.toString());
                    return true;
                }
                // el permiso del banco (Enable Banking y luego la web del banco) se da aquí dentro, no en el
                // navegador: así la vuelta llega a la app, donde tienes la sesión
                if (!enBanco && esDeEnableBanking(u)) {
                    entrarAlBanco();
                    v.loadUrl(u.toString());
                    return true;
                }
                if (enBanco) {
                    if (esquema.equals("http") || esquema.equals("https")) {
                        // la página del banco que le corresponde a su app (Trade Republic y muchos más dan el permiso
                        // en su app): se le pasa a ella con el enlace entero, que es el que lleva qué permiso se pide
                        if (!esDeEnableBanking(u) && abrirEnSuApp(u)) return true;
                        return false;
                    }
                    abrirApp(u);   // intent:// o el esquema de la app del banco
                    return true;
                }
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
        actualizarAlCargar = getIntent() != null && getIntent().getBooleanExtra("actualizarApp", false);
        if (guardado != null) web.restoreState(guardado);
        else web.loadUrl(direccion(getIntent()));
        // si la web ya se llama GrowFolio, la app se cambia a ella (los datos del móvil son los mismos: mismo sitio)
        new Thread(() -> {
            if (!Datos.comprobarNombre(this)) return;
            runOnUiThread(() -> {
                WEB = Datos.web(this);
                String u = web.getUrl();
                if (u != null && Uri.parse(u).getPath() != null && Uri.parse(u).getPath().toLowerCase().startsWith("/inversiones")) {
                    String f = Uri.parse(u).getEncodedFragment();
                    web.loadUrl(WEB + (f != null ? "#" + f : ""));
                }
            });
        }).start();
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

    /**
     * La app del banco, al dar el permiso, abre el enlace de vuelta de Enable Banking. Si GrowFolio puede abrir esos
     * enlaces (Android lo pregunta una vez), llega aquí y se termina en esta misma página, que es la que tiene la
     * sesión: en el navegador salía «ha caducado» porque allí no la tenía.
     */
    private static String enlaceEnableBanking(Intent i) {
        Uri d = i == null ? null : i.getData();
        return d != null && "https".equals(d.getScheme()) && esDeEnableBanking(d) ? d.toString() : null;
    }

    /** El widget abre la app en una sección concreta (#ruta, #cartera...); la vuelta del banco, con su código */
    private String direccion(Intent i) {
        String banco = vueltaBanco(i);
        if (banco != null) return banco;
        String eb = enlaceEnableBanking(i);
        if (eb != null) {
            entrarAlBanco();
            return eb;
        }
        String h = i != null ? i.getStringExtra("hash") : null;
        return h != null && !h.isEmpty() ? WEB + "#" + h : WEB;
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        String banco = vueltaBanco(i);
        if (banco != null) {
            traspaso = false;
            if (enBanco) salirDelBanco();
            web.loadUrl(banco);
            return;
        }
        String eb = enlaceEnableBanking(i);
        if (eb != null) {
            traspaso = false;   // ha vuelto con la respuesta: que onResume no saque de la página del banco
            if (!enBanco) entrarAlBanco();
            web.loadUrl(eb);
            return;
        }
        String t = token(i);
        if (t != null && !t.isEmpty()) {
            tokenPendiente = t;
            guardarToken();
            return;
        }
        // desde el aviso de la app nueva («Actualizar»): sin recargar nada, empieza a bajarla
        if (i != null && i.getBooleanExtra("actualizarApp", false)) {
            if (cargada) lanzarActualizacion(); else actualizarAlCargar = true;
            return;
        }
        // desde el aviso de una versión nueva de la web: solo se recarga si la que tienes abierta es más antigua (si ya
        // es esa, no hace falta pasar otra vez por la pantalla de carga)
        if (i != null && i.getBooleanExtra("version", false)) {
            String v = i.getStringExtra("v");
            if (v == null || v.isEmpty() || !cargada) { web.loadUrl(WEB); return; }
            web.evaluateJavascript("typeof VERSION === 'string' ? VERSION : ''", r -> {
                String actual = r == null ? "" : r.replace("\"", "");
                if (actual.isEmpty() || Versiones.comparar(v, actual) > 0) web.loadUrl(WEB);
            });
            return;
        }
        String h = i != null ? i.getStringExtra("hash") : null;
        if (h != null && !h.isEmpty()) web.evaluateJavascript("location.hash = '" + h.replaceAll("[^a-z]", "") + "'", null);
    }

    private static boolean esDeLaWeb(Uri u) {
        String p = u.getPath() != null ? u.getPath().toLowerCase() : "";
        return "charly10sf.github.io".equalsIgnoreCase(u.getHost()) && (p.startsWith("/inversiones") || p.startsWith("/growfolio"));
    }

    /** Android 12 o más: si el usuario ha dejado que GrowFolio abra los enlaces de Enable Banking («Abrir de forma predeterminada») */
    boolean enlacesBancoListos() {
        if (android.os.Build.VERSION.SDK_INT < 31) return true;   // antes de Android 12 pregunta con qué abrirlos
        try {
            android.content.pm.verify.domain.DomainVerificationManager m = getSystemService(android.content.pm.verify.domain.DomainVerificationManager.class);
            android.content.pm.verify.domain.DomainVerificationUserState e = m.getDomainVerificationUserState(getPackageName());
            if (e == null) return false;
            for (java.util.Map.Entry<String, Integer> x : e.getHostToStateMap().entrySet())
                if (x.getKey().endsWith("enablebanking.com") && x.getValue() != android.content.pm.verify.domain.DomainVerificationUserState.DOMAIN_STATE_NONE) return true;
            return false;
        } catch (Exception ex) {
            return false;
        }
    }

    void abrirAjustesEnlaces() {
        try {
            Intent i = android.os.Build.VERSION.SDK_INT >= 31
                    ? new Intent(Settings.ACTION_APP_OPEN_BY_DEFAULT_SETTINGS, Uri.parse("package:" + getPackageName()))
                    : new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
            startActivity(i);
        } catch (Exception e) {
            startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())));
        }
    }

    private static boolean esDeEnableBanking(Uri u) {
        String h = u.getHost() == null ? "" : u.getHost().toLowerCase();
        return h.equals("enablebanking.com") || h.endsWith(".enablebanking.com");
    }

    /**
     * Mientras das permiso al banco, la web va como un Chrome de ordenador: en un móvil, algunos bancos (Trade
     * Republic) solo enseñan «descarga la app» y, abierta así, su app no sabe qué permiso le pides. En la versión de
     * ordenador entras con tu número y tu PIN y lo confirmas en su app. También deja las cookies de terceros, que
     * algunos bancos necesitan para el inicio de sesión.
     */
    private void entrarAlBanco() {
        enBanco = true;
        String movil = web.getSettings().getUserAgentString();
        if (agenteMovil == null) agenteMovil = movil;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("Chrome/[\\d.]+").matcher(movil);
        String chrome = m.find() ? m.group() : "Chrome/130.0.0.0";
        web.getSettings().setUserAgentString("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " + chrome + " Safari/537.36");
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        // las webs de los bancos cuentan con un fondo blanco: con el negro de la app, sus letras oscuras no se veían
        web.setBackgroundColor(0xFFFFFFFF);
        Toast.makeText(this, "Abriendo tu banco dentro de GrowFolio…", Toast.LENGTH_SHORT).show();
    }

    private void salirDelBanco() {
        enBanco = false;
        if (agenteMovil != null) web.getSettings().setUserAgentString(agenteMovil);
        web.setBackgroundColor(0xFF000000);
    }

    /**
     * Abre el enlace en la app que lo reclama, si hay una que no sea un navegador (Android 11 o más). Así el permiso
     * llega a la app del banco con todo lo que necesita; abierta a mano, la app no sabe qué permiso le pides.
     */
    private boolean abrirEnSuApp(Uri u) {
        if (android.os.Build.VERSION.SDK_INT < 30) return false;
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, u).addCategory(Intent.CATEGORY_BROWSABLE)
                    .addFlags(Intent.FLAG_ACTIVITY_REQUIRE_NON_BROWSER | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            traspaso = true;
            Toast.makeText(this, "Da el permiso en la app de tu banco: al acabar vuelves aquí", Toast.LENGTH_LONG).show();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** la vuelta del banco cuando llega al navegador: inversiones://banco?code=…&state=… (la web la reenvía aquí) */
    private static String vueltaBanco(Intent i) {
        Uri d = i == null ? null : i.getData();
        if (d == null || !"inversiones".equals(d.getScheme()) || !"banco".equals(d.getHost()) || d.getEncodedQuery() == null) return null;
        return WEB + "?" + d.getEncodedQuery() + "#cartera";
    }

    /** un enlace de la web del banco que abre su app (intent:// o su propio esquema); si no está, su alternativa */
    private void abrirApp(Uri u) {
        Intent i = null;
        try {
            i = "intent".equalsIgnoreCase(u.getScheme()) ? Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME) : new Intent(Intent.ACTION_VIEW, u);
            // solo lo que se abre desde un enlace, nunca una pantalla interna de otra app
            i.addCategory(Intent.CATEGORY_BROWSABLE);
            i.setComponent(null);
            i.setSelector(null);
            startActivity(i);
        } catch (Exception e) {
            String alt = i != null ? i.getStringExtra("browser_fallback_url") : null;
            if (alt != null && alt.startsWith("http")) web.loadUrl(alt);
            else Toast.makeText(this, "No se puede abrir la app del banco", Toast.LENGTH_SHORT).show();
        }
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
    /** La web enseña su aviso de la app con la barra de progreso y empieza a bajarla; si es una web de antes, lo hace la app */
    private void lanzarActualizacion() {
        web.evaluateJavascript("window.actualizarAppYa ? (actualizarAppYa(), 'web') : 'no'", r -> {
            if (!"\"web\"".equals(r)) actualizarNativo();
        });
    }

    private void actualizarNativo() {
        boolean en = Datos.en(this);
        Toast.makeText(this, en ? "Downloading the new version of the app…" : "Bajando la versión nueva de la app…", Toast.LENGTH_LONG).show();
        new Thread(() -> {
            JSONObject a = Versiones.app(this);
            String apk = a == null ? "" : a.optString("apk", "");
            if (a == null || a.optInt("version", 0) <= BuildConfig.VERSION_CODE || !Actualizador.valida(apk)) {
                runOnUiThread(() -> Toast.makeText(this, en ? "You already have the latest version." : "Ya tienes la última versión.", Toast.LENGTH_LONG).show());
                return;
            }
            Actualizador.bajar(this, apk);
        }).start();
    }

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
        if (pedido == DICTAR) {
            String t = null;
            if (resultado == RESULT_OK && datos != null) {
                java.util.ArrayList<String> r = datos.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS);
                if (r != null && !r.isEmpty()) t = r.get(0);
            }
            js(t != null ? "window.resultadoDictado && resultadoDictado(" + JSONObject.quote(t) + ")"
                    : "window.resultadoDictado && resultadoDictado(null, " + (resultado == RESULT_CANCELED ? "'cancelado'" : "'nada'") + ")");
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

    /** El dictado de Google (la ventanita del micrófono): no hace falta permiso de micrófono en la app */
    void dictar(String idioma) {
        String lang = idioma == null || idioma.isEmpty() ? "es-ES" : idioma;
        try {
            Intent i = new Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, lang);
            i.putExtra(android.speech.RecognizerIntent.EXTRA_PROMPT, lang.startsWith("en") ? "Ask GrowIA" : "Pregúntale a GrowIA");
            i.putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            startActivityForResult(i, DICTAR);
        } catch (Exception e) {
            js("window.resultadoDictado && resultadoDictado(null, 'sin reconocimiento')");
        }
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
        else if (enBanco) {   // a medio permiso del banco, atrás vuelve a GrowFolio (nunca sale de la app)
            salirDelBanco();
            web.loadUrl(WEB + "#cartera");
        }
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
        enPantalla = false;
        // la web manda al widget lo último antes de quedarse en segundo plano
        web.evaluateJavascript("window.enviarWidget && enviarWidget(true)", null);
        web.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        enPantalla = true;
        web.onResume();
        // de vuelta de la app del banco sin su respuesta (si llega, entra antes por onNewIntent y ya no estamos en el
        // banco): fuera de la página de Enable Banking, que se quedaba cargando, y a tu cartera con un aviso
        if (traspaso) {
            traspaso = false;
            if (enBanco) {
                salirDelBanco();
                web.loadUrl(WEB + "#cartera");
                Toast.makeText(this, "Tu banco no ha devuelto la respuesta. Si ya diste el permiso, espera un momento: llegará sola; si no, prueba otra vez desde Efectivo.", Toast.LENGTH_LONG).show();
            }
        }
    }
}
