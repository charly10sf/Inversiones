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
        // si el widget aún no tiene los cierres del mes (o son de hace rato), los baja y se vuelve a pintar
        if (Datos.viejos(ctx)) new Thread(() -> {
            if (Datos.descargar(ctx)) Widget.actualizarTodos(ctx);
        }).start();
    }

    @JavascriptInterface
    public int version() {
        return BuildConfig.VERSION_CODE;
    }
}
