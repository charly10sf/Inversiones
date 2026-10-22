package es.inversiones.app;

import android.annotation.TargetApi;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.webkit.JavascriptInterface;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import org.json.JSONObject;

import java.util.concurrent.Executors;

/** Lo que la web puede pedirle a la app: guardar la foto de la cartera para el widget, saber la versión,
 *  bajar e instalar la versión nueva y pedir la huella para el bloqueo. */
public class Puente {
    /** un solo hilo para las respuestas de Credential Manager (antes se creaba uno nuevo en cada toque) */
    private static final java.util.concurrent.Executor HILO = Executors.newSingleThreadExecutor();
    private final Context ctx;
    private final Principal act;

    Puente(Principal a) {
        act = a;
        ctx = a.getApplicationContext();
    }

    @JavascriptInterface
    public void guardarWidget(String json) {
        Datos.guardarFoto(ctx, json);
        Widget.actualizarTodos(ctx);
        // si el widget aún no tiene los cierres del mes (o son de hace rato), los baja y se vuelve a pintar
        if (Datos.viejos(ctx)) new Thread(() -> {
            if (Datos.descargar(ctx)) Widget.actualizarTodos(ctx);
        }).start();
    }

    /** un toque suave (la vibración de las teclas) al cambiar de pestaña; si el móvil la tiene quitada, nada */
    /** desde la compilación 32 el permiso del banco se da dentro de la app (antes se iba al navegador y no volvía) */
    /** 0.3.11d: con qué nombre carga la app la web (Inversiones o GrowFolio). Que exista dice además que la app ya sabe
        cambiar sola al nombre nuevo */
    @JavascriptInterface
    public String repo() {
        return Datos.repo(ctx);
    }

    @JavascriptInterface
    public boolean bancoDentro() {
        return true;
    }

    /** si la app del banco podrá devolverte aquí (GrowFolio abre los enlaces de Enable Banking) */
    @JavascriptInterface
    public boolean enlacesBancoListos() {
        return act.enlacesBancoListos();
    }

    @JavascriptInterface
    public void abrirAjustesEnlaces() {
        act.runOnUiThread(() -> act.abrirAjustesEnlaces());
    }

    @JavascriptInterface
    public void toque() {
        act.runOnUiThread(() -> act.getWindow().getDecorView().performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP));
    }

    /** Avisos en el móvil (Ajustes > Avisos y resumen): activa o quita la revisión cada media hora. Al activarlos
     *  en Android 13 o más pide el permiso de notificaciones; la respuesta llega a la web por permisoAvisos(ok). */
    @JavascriptInterface
    public void avisos(boolean on) {
        Avisos.programar(ctx, on);
        if (on && !Avisos.permitidos(ctx)) act.runOnUiThread(act::pedirPermisoAvisos);
    }

    /** Dictar la pregunta de Pregúntale con el dictado de Google del móvil; el texto llega a la web por
     *  resultadoDictado(texto) o resultadoDictado(null, motivo) */
    @JavascriptInterface
    public void dictar(String idioma) {
        act.runOnUiThread(() -> act.dictar(idioma));
    }

    /** la versión de la web que se acaba de abrir: de esa ya no hace falta avisar */
    @JavascriptInterface
    public void versionVista(String v) {
        Versiones.vista(ctx, v);
    }

    /** el aviso de las versiones nuevas: encenderlo o apagarlo (y pedir el permiso de notificaciones si falta) */
    @JavascriptInterface
    public void avisosVersiones(boolean on) {
        Versiones.activar(ctx, on);
        if (on && !Avisos.permitidos(ctx)) act.runOnUiThread(act::pedirPermisoAvisos);
    }

    @JavascriptInterface
    public boolean avisosVersionesActivados() {
        return Versiones.activados(ctx);
    }

    @JavascriptInterface
    public boolean avisosPermitidos() {
        return Avisos.permitidos(ctx);
    }

    /** Un aviso que manda la web (el de prueba, o una pregunta de GrowIA que llega con la app abierta) */
    @JavascriptInterface
    public void notificar(String titulo, String cuerpo, String hash) {
        String h = hash == null ? "cartera" : hash.replaceAll("[^a-z]", "");
        Avisos.mostrar(ctx, "web:" + titulo, titulo == null ? "GrowFolio" : titulo, cuerpo == null ? "" : cuerpo, h.isEmpty() ? "cartera" : h);
    }

    @JavascriptInterface
    public void borrarWidget() {
        Datos.borrar(ctx);
        Widget.actualizarTodos(ctx);
    }

    @JavascriptInterface
    public int version() {
        return BuildConfig.VERSION_CODE;
    }

    @JavascriptInterface
    public String nombreVersion() {
        return BuildConfig.VERSION_NAME;
    }

    /** Baja el APK nuevo y abre el instalador; el progreso llega a la web por progresoApp(pct, estado) */
    @JavascriptInterface
    public void actualizar(String url) {
        if (!Actualizador.valida(url)) {
            act.progreso(-1, "dirección no válida");
            return;
        }
        new Thread(() -> Actualizador.bajar(act, url)).start();
    }

    /** Vuelve a abrir el instalador con lo ya descargado */
    @JavascriptInterface
    public void instalar() {
        act.runOnUiThread(() -> act.instalar(Actualizador.archivo(ctx)));
    }

    /** ¿Hay huella (o cara) configurada en el móvil? */
    @TargetApi(30)
    @JavascriptInterface
    public boolean huellaDisponible() {
        if (Build.VERSION.SDK_INT >= 30) {
            BiometricManager bm = ctx.getSystemService(BiometricManager.class);
            return bm != null && bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS;
        }
        if (Build.VERSION.SDK_INT >= 29) {
            BiometricManager bm = ctx.getSystemService(BiometricManager.class);
            return bm != null && bm.canAuthenticate() == BiometricManager.BIOMETRIC_SUCCESS;
        }
        if (Build.VERSION.SDK_INT >= 28) {
            KeyguardManager km = ctx.getSystemService(KeyguardManager.class);
            return km != null && km.isDeviceSecure() && ctx.getPackageManager().hasSystemFeature(PackageManager.FEATURE_FINGERPRINT);
        }
        return false;
    }

    /** Enseña el diálogo de la huella del sistema; el resultado llega a la web por resultadoHuella(ok, motivo) */
    @JavascriptInterface
    public void pedirHuella(String titulo, String botonPin) {
        if (Build.VERSION.SDK_INT < 28) {
            act.js("window.resultadoHuella && resultadoHuella(false, 'sin huella')");
            return;
        }
        act.runOnUiThread(() -> mostrarHuella(titulo, botonPin));
    }

    @TargetApi(28)
    private void mostrarHuella(String titulo, String botonPin) {
        try {
            BiometricPrompt.Builder b = new BiometricPrompt.Builder(act)
                    .setTitle(titulo == null || titulo.isEmpty() ? "GrowFolio" : titulo)
                    .setNegativeButton(botonPin == null || botonPin.isEmpty() ? "PIN" : botonPin, act.getMainExecutor(),
                            (d, w) -> act.js("window.resultadoHuella && resultadoHuella(false, 'pin')"));
            if (Build.VERSION.SDK_INT >= 30) b.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK);
            b.build().authenticate(new CancellationSignal(), act.getMainExecutor(), new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) {
                    act.js("window.resultadoHuella && resultadoHuella(true, '')");
                }

                @Override
                public void onAuthenticationError(int codigo, CharSequence msg) {
                    act.js("window.resultadoHuella && resultadoHuella(false, 'cancelada " + codigo + "')");
                }
            });
        } catch (Exception e) {
            act.js("window.resultadoHuella && resultadoHuella(false, 'error')");
        }
    }

    /** Entrar con Google: el selector de cuentas de Android devuelve un token de Google que la web cambia por
     *  la sesión de Firebase. clienteWeb es el «ID de cliente web» del proveedor Google de Firebase. */
    @JavascriptInterface
    public boolean googleDisponible() {
        return true;
    }

    /** Entrar con Google con el selector de cuentas clásico de Google Play: funciona en todos los móviles con
     *  Google, también donde el de Credential Manager no contesta (algunos Samsung con Android 14). */
    @JavascriptInterface
    public boolean googleClasico() {
        return true;
    }

    @JavascriptInterface
    public void entrarGoogleClasico(String clienteWeb) {
        act.runOnUiThread(() -> {
            try {
                com.google.android.gms.auth.api.signin.GoogleSignInOptions o = new com.google.android.gms.auth.api.signin.GoogleSignInOptions
                        .Builder(com.google.android.gms.auth.api.signin.GoogleSignInOptions.DEFAULT_SIGN_IN)
                        .requestIdToken(clienteWeb).requestEmail().build();
                com.google.android.gms.auth.api.signin.GoogleSignInClient cl = com.google.android.gms.auth.api.signin.GoogleSignIn.getClient(act, o);
                act.js("window.pasoGoogle && window.pasoGoogle('pedido')");
                // cierra antes la sesión de Google de la app (no la del móvil) para que siempre deje elegir cuenta
                cl.signOut().addOnCompleteListener(x -> act.startActivityForResult(cl.getSignInIntent(), Principal.ENTRAR_GOOGLE));
            } catch (Exception e) {
                act.js("window.resultadoGoogle && window.resultadoGoogle(false, " + JSONObject.quote(String.valueOf(e)) + ")");
            }
        });
    }

    @JavascriptInterface
    public void entrarGoogle(String clienteWeb) {
        act.runOnUiThread(() -> {
            try {
                // el flujo del botón «Continuar con Google»: siempre enseña el selector de cuentas de Google
                // (el de un toque se puede silenciar solo si antes lo cerraste varias veces)
                GetSignInWithGoogleOption op = new GetSignInWithGoogleOption.Builder(clienteWeb).build();
                GetCredentialRequest req = new GetCredentialRequest.Builder().addCredentialOption(op).build();
                act.js("window.pasoGoogle && window.pasoGoogle('pedido')");
                CredentialManager.create(act).getCredentialAsync(act, req, new CancellationSignal(), HILO,
                        new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                            @Override
                            public void onResult(GetCredentialResponse r) {
                                try {
                                    Credential c = r.getCredential();
                                    if (c instanceof CustomCredential && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(c.getType())) {
                                        GoogleIdTokenCredential g = GoogleIdTokenCredential.createFrom(((CustomCredential) c).getData());
                                        act.js("window.resultadoGoogle && window.resultadoGoogle(true, " + JSONObject.quote(g.getIdToken()) + ")");
                                    } else {
                                        act.js("window.resultadoGoogle && window.resultadoGoogle(false, " + JSONObject.quote("tipo " + c.getType()) + ")");
                                    }
                                } catch (Exception e) {
                                    act.js("window.resultadoGoogle && window.resultadoGoogle(false, " + JSONObject.quote(String.valueOf(e)) + ")");
                                }
                            }

                            @Override
                            public void onError(GetCredentialException e) {
                                act.js("window.resultadoGoogle && window.resultadoGoogle(false, " + JSONObject.quote(e.getType() + ": " + e.getMessage()) + ")");
                            }
                        });
            } catch (Exception e) {
                act.js("window.resultadoGoogle && window.resultadoGoogle(false, " + JSONObject.quote(String.valueOf(e)) + ")");
            }
        });
    }
}
