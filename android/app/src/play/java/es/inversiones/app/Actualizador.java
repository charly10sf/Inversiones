package es.inversiones.app;

import android.content.Context;

import java.io.File;

/**
 * 0.8.3 · La versión de Google Play no se actualiza sola: Play lo prohíbe y la actualiza él. Este es el Actualizador de
 * la versión de GitHub (src/directa) sin nada dentro y con los mismos nombres, para que el resto compile igual y no
 * quede en la app ningún código que instale paquetes.
 */
final class Actualizador {
    static final String NOMBRE = "growfolio.apk";

    private Actualizador() {}

    static File archivo(Context c) { return new File(c.getCacheDir(), NOMBRE); }

    static boolean valida(String url) { return false; }

    static void bajar(Principal act, String url) {}

    static boolean puedeSola(Context c) { return false; }

    static void autoActualizar(Context c, org.json.JSONObject app) {}
}
