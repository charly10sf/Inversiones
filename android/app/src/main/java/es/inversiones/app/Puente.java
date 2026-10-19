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

import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import org.json.JSONObject;

import java.util.concurrent.Executors;

/** Lo que la web puede pedirle a la app: guardar la foto de la cartera para el widget, saber la versión,
 *  bajar e instalar la versión nueva y pedir la huella para el bloqueo. */
public class Puente {
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

    @JavascriptInterface
    public void entrarGoogle(String clienteWeb) {
        act.runOnUiThread(() -> {
            try {
                GetGoogleIdOption op = new GetGoogleIdOption.Builder()
                        .setFilterByAuthorizedAccounts(false)
                        .setServerClientId(clienteWeb)
                        .setAutoSelectEnabled(false)
                        .build();
                GetCredentialRequest req = new GetCredentialRequest.Builder().addCredentialOption(op).build();
                CredentialManager.create(act).getCredentialAsync(act, req, new CancellationSignal(), Executors.newSingleThreadExecutor(),
                        new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                            @Override
                            public void onResult(GetCredentialResponse r) {
                                Credential c = r.getCredential();
                                if (c instanceof CustomCredential && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(c.getType())) {
                                    GoogleIdTokenCredential g = GoogleIdTokenCredential.createFrom(((CustomCredential) c).getData());
                                    act.js("window.resultadoGoogle && window.resultadoGoogle(true, " + JSONObject.quote(g.getIdToken()) + ")");
                                } else {
                                    act.js("window.resultadoGoogle && window.resultadoGoogle(false, 'tipo')");
                                }
                            }

                            @Override
                            public void onError(GetCredentialException e) {
                                act.js("window.resultadoGoogle && window.resultadoGoogle(false, " + JSONObject.quote(String.valueOf(e.getType())) + ")");
                            }
                        });
            } catch (Exception e) {
                act.js("window.resultadoGoogle && window.resultadoGoogle(false, " + JSONObject.quote(String.valueOf(e)) + ")");
            }
        });
    }
}
