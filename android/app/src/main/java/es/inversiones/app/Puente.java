package es.inversiones.app;

import android.content.Context;
import android.webkit.JavascriptInterface;

/** Lo que la web puede pedirle a la app: guardar la foto de la cartera para el widget y saber la versión. */
public class Puente {
    private final Context ctx;

    Puente(Context c) {
        ctx = c.getApplicationContext();
    }

    @JavascriptInterface
    public void guardarWidget(String json) {
        Datos.guardarFoto(ctx, json);
        Widget.actualizarTodos(ctx);
    }

    @JavascriptInterface
    public int version() {
        return BuildConfig.VERSION_CODE;
    }
}
