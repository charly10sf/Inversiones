package es.inversiones.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import java.io.ByteArrayOutputStream;

/**
 * El widget: se dibuja entero como imagen (Lienzo) al tamaño que tenga, así que se puede estirar y encoger
 * y siempre se ve con la letra de la web. Se refresca solo cada 30 minutos (lo mínimo que deja Android),
 * al tocar el icono de refrescar y cada vez que abres la app.
 */
public class Widget extends AppWidgetProvider {
    static final String REFRESCAR = "es.inversiones.app.REFRESCAR";
    static final String PERIODO = "es.inversiones.app.PERIODO";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) pintar(c, m, id);
        refrescarEnSegundoPlano(c);
    }

    @Override
    public void onReceive(Context c, Intent i) {
        if (REFRESCAR.equals(i.getAction())) {
            refrescarEnSegundoPlano(c);
            return;
        }
        if (PERIODO.equals(i.getAction())) {   // el siguiente: 1 semana, 1 mes, 3 meses, 1 año y vuelta a empezar
            int id = i.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return;
            int ahora = periodo(c, id), k = 0;
            while (k < Datos.PERIODOS.length && Datos.PERIODOS[k] != ahora) k++;
            Datos.prefs(c).edit().putInt("periodo_" + id, Datos.PERIODOS[(k + 1) % Datos.PERIODOS.length]).apply();
            pintar(c, AppWidgetManager.getInstance(c), id);
            return;
        }
        super.onReceive(c, i);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle opciones) {
        pintar(c, m, id);
    }

    private void refrescarEnSegundoPlano(Context c) {
        final PendingResult pendiente = goAsync();
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            try {
                Datos.descargar(app);
                actualizarTodos(app);
            } finally {
                pendiente.finish();
            }
        }).start();
    }

    static void actualizarTodos(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, Widget.class))) pintar(c, m, id);
    }

    static void pintar(Context c, AppWidgetManager m, int id) {
        // el tamaño en vertical: ancho mínimo y alto máximo (así lo da Android), en dp
        Bundle o = m.getAppWidgetOptions(id);
        float ancho = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0), alto = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        if (ancho < 40 || alto < 40) {
            ancho = 340;
            alto = 180;
        }
        Datos.Resultado r = Datos.calcular(c, periodo(c, id));
        Bitmap b = Lienzo.dibujar(c, ancho, alto, r);
        // la imagen va comprimida: así cabe de sobra en lo que Android deja mandar a la pantalla de inicio
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        b.compress(Build.VERSION.SDK_INT >= 30 ? Bitmap.CompressFormat.WEBP_LOSSLESS : Bitmap.CompressFormat.PNG, 100, out);
        b.recycle();
        byte[] bytes = out.toByteArray();

        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_lienzo);
        v.setImageViewIcon(R.id.lienzo, Icon.createWithData(bytes, 0, bytes.length));
        v.setContentDescription(R.id.lienzo, r.hay ? "Patrimonio " + (r.oculto ? "oculto" : Datos.eur(r.total, false)) + ", hoy " + Datos.pct(r.diaPct) : "Inversiones: abre la app");
        v.setOnClickPendingIntent(R.id.lienzo, abrir(c, "cartera", 1));
        v.setOnClickPendingIntent(R.id.refrescar, refrescar(c));
        v.setViewVisibility(R.id.refrescar, alto >= 110 && r.hay ? View.VISIBLE : View.GONE);
        v.setOnClickPendingIntent(R.id.periodo, cambiarPeriodo(c, id));
        v.setViewVisibility(R.id.periodo, Lienzo.conPeriodo(ancho, alto, r) ? View.VISIBLE : View.GONE);
        m.updateAppWidget(id, v);
    }

    private static PendingIntent abrir(Context c, String hash, int codigo) {
        Intent i = new Intent(c, Principal.class).putExtra("hash", hash).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, codigo, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static int periodo(Context c, int id) {
        return Datos.prefs(c).getInt("periodo_" + id, 31);
    }

    private static PendingIntent cambiarPeriodo(Context c, int id) {
        Intent i = new Intent(c, Widget.class).setAction(PERIODO).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
        return PendingIntent.getBroadcast(c, 1000 + id, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent refrescar(Context c) {
        Intent i = new Intent(c, Widget.class).setAction(REFRESCAR);
        return PendingIntent.getBroadcast(c, 3, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
