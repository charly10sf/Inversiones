package es.inversiones.app;

import android.content.Context;
import android.webkit.JavascriptInterface;

/** Lo que la web puede pedirle a la app: guardar la foto de la cartera para el widget, saber la versión
 *  y bajar e instalar la versión nueva. */
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
}
