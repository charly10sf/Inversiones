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
import android.os.SystemClock;
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
    private static final String DIAS = "dias", DISENO = "diseno";
    /** sube cuando cambia widget_lienzo.xml de forma que las actualizaciones parciales de antes ya no valgan
     *  (3: la rueda de refrescar es una vista que gira) */
    private static final int DISENO_ACTUAL = 3;
    /** lo mínimo que gira la rueda, para que se vea aunque los precios bajen en un momento */
    private static final long GIRO_MINIMO = 1100;
    private static final int[] PLAZOS = {R.id.plazo0, R.id.plazo1, R.id.plazo2, R.id.plazo3, R.id.plazo4};

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) pintar(c, m, id);
        refrescarEnSegundoPlano(c, false);
    }

    @Override
    public void onReceive(Context c, Intent i) {
        if (REFRESCAR.equals(i.getAction())) {
            refrescarEnSegundoPlano(c, true);
            return;
        }
        if (PERIODO.equals(i.getAction())) {
            int id = i.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return;
            // el plazo que has tocado o, en la pastilla de los estrechos, el siguiente (24 h, 1 semana, 1 mes, 3 meses, 1 año)
            int ahora = periodo(c, id), dias = i.getIntExtra(DIAS, 0);
            if (dias == 0) dias = Datos.PERIODOS[(Datos.indicePeriodo(ahora) + 1) % Datos.PERIODOS.length];
            if (dias == ahora) return;
            Datos.prefs(c).edit().putInt("periodo_" + id, dias).apply();
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            // con fundido solo si el toque viene de esta versión (su widget ya tiene las dos copias); si no, de golpe
            if (i.getIntExtra(DISENO, 0) == DISENO_ACTUAL) cambiarPlazo(c, m, id);
            else pintar(c, m, id);
            return;
        }
        super.onReceive(c, i);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle opciones) {
        pintar(c, m, id);
    }

    /** baja los precios y repinta. Si lo has pedido tú (la rueda), la rueda gira mientras tanto y al repintar
     *  vuelve a quedarse quieta, haya ido bien o no */
    private void refrescarEnSegundoPlano(Context c, boolean aMano) {
        final PendingResult pendiente = goAsync();
        final Context app = c.getApplicationContext();
        if (aMano) girar(app);
        new Thread(() -> {
            long t0 = SystemClock.uptimeMillis();
            try {
                Datos.descargar(app);
                long falta = GIRO_MINIMO - (SystemClock.uptimeMillis() - t0);
                if (aMano && falta > 0) SystemClock.sleep(falta);
            } finally {
                try {
                    actualizarTodos(app);
                } finally {
                    pendiente.finish();
                }
            }
        }).start();
    }

    /** la rueda de refrescar empieza a girar en todos los widgets (solo en los que ya tienen la rueda como vista) */
    private static void girar(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, Widget.class))) {
            if (Datos.prefs(c).getInt("diseno_" + id, 0) != DISENO_ACTUAL) continue;
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_lienzo);
            v.setViewVisibility(R.id.refresco_ico, View.INVISIBLE);
            v.setViewVisibility(R.id.refresco_gira, View.VISIBLE);
            m.partiallyUpdateAppWidget(id, v);
        }
    }

    static void actualizarTodos(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, Widget.class))) pintar(c, m, id);
    }

    /** el tamaño en vertical: ancho mínimo y alto máximo (así lo da Android), en dp */
    private static float[] tamano(AppWidgetManager m, int id) {
        Bundle o = m.getAppWidgetOptions(id);
        float ancho = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0), alto = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        if (ancho < 40 || alto < 40) {
            ancho = 340;
            alto = 180;
        }
        return new float[]{ancho, alto};
    }

    /** el widget dibujado y comprimido: así cabe de sobra en lo que Android deja mandar a la pantalla de inicio */
    private static Icon imagen(Context c, float ancho, float alto, Datos.Resultado r) {
        Bitmap b = Lienzo.dibujar(c, ancho, alto, r);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        b.compress(Build.VERSION.SDK_INT >= 30 ? Bitmap.CompressFormat.WEBP_LOSSLESS : Bitmap.CompressFormat.PNG, 100, out);
        b.recycle();
        byte[] bytes = out.toByteArray();
        return Icon.createWithData(bytes, 0, bytes.length);
    }

    private static String descripcion(Datos.Resultado r) {
        if (r.en) return r.hay ? "Net worth " + (r.oculto ? "hidden" : Datos.eur(r.total, false)) + ", today " + Datos.pct(r.diaPct) + ", " + r.rango + " chart" : "GrowFolio: open the app";
        return r.hay ? "Patrimonio " + (r.oculto ? "oculto" : Datos.eur(r.total, false)) + ", hoy " + Datos.pct(r.diaPct) + ", gráfica de " + r.rango : "GrowFolio: abre la app";
    }

    /**
     * Todo el widget de nuevo. Va siempre en la primera copia: si se estaba viendo la segunda (tras cambiar de plazo),
     * se vuelve a la primera con el mismo fundido. Así, si Android lo vuelve a montar desde cero, sale el bueno.
     */
    static void pintar(Context c, AppWidgetManager m, int id) {
        float[] t = tamano(m, id);
        float ancho = t[0], alto = t[1];
        Datos.Resultado r = Datos.calcular(c, periodo(c, id));
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_lienzo);
        v.setImageViewIcon(R.id.lienzo, imagen(c, ancho, alto, r));
        String d = descripcion(r);
        v.setContentDescription(R.id.lienzo, d);
        v.setContentDescription(R.id.lienzo2, d);
        if (Datos.prefs(c).getInt("copia_" + id, 0) != 0) {
            v.setDisplayedChild(R.id.lienzos, 0);
            Datos.prefs(c).edit().putInt("copia_" + id, 0).apply();
        }
        PendingIntent abre = abrir(c, "cartera", 1);
        v.setOnClickPendingIntent(R.id.lienzo, abre);
        v.setOnClickPendingIntent(R.id.lienzo2, abre);
        v.setOnClickPendingIntent(R.id.refrescar, refrescar(c));
        v.setViewVisibility(R.id.refrescar, alto >= 110 && r.hay ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.refresco_ico, View.VISIBLE);
        v.setViewVisibility(R.id.refresco_gira, View.GONE);
        int modo = Lienzo.modoPlazo(ancho, alto, r);
        v.setViewVisibility(R.id.plazos, modo == 2 ? View.VISIBLE : View.GONE);
        for (int k = 0; k < PLAZOS.length; k++) v.setOnClickPendingIntent(PLAZOS[k], cambiarPeriodo(c, id, Datos.PERIODOS[k]));
        v.setViewVisibility(R.id.periodo, modo == 1 ? View.VISIBLE : View.GONE);
        v.setOnClickPendingIntent(R.id.periodo, cambiarPeriodo(c, id, 0));
        m.updateAppWidget(id, v);
        Datos.prefs(c).edit().putInt("diseno_" + id, DISENO_ACTUAL).apply();
    }

    /**
     * Solo cambia el plazo: se dibuja en la copia que no se ve y se pasa a ella con un fundido (el ViewFlipper de
     * widget_lienzo.xml), sin rehacer el resto del widget.
     */
    private static void cambiarPlazo(Context c, AppWidgetManager m, int id) {
        float[] t = tamano(m, id);
        Datos.Resultado r = Datos.calcular(c, periodo(c, id));
        int otra = 1 - Datos.prefs(c).getInt("copia_" + id, 0);
        int vista = otra == 0 ? R.id.lienzo : R.id.lienzo2;
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_lienzo);
        v.setImageViewIcon(vista, imagen(c, t[0], t[1], r));
        v.setContentDescription(vista, descripcion(r));
        v.setDisplayedChild(R.id.lienzos, otra);
        m.partiallyUpdateAppWidget(id, v);
        Datos.prefs(c).edit().putInt("copia_" + id, otra).apply();
    }

    private static PendingIntent abrir(Context c, String hash, int codigo) {
        Intent i = new Intent(c, Principal.class).putExtra("hash", hash).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, codigo, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static int periodo(Context c, int id) {
        return Datos.prefs(c).getInt("periodo_" + id, 31);
    }

    /** tocar un plazo («dias») o, con 0, pasar al siguiente; cada uno con su código para que Android no los junte */
    private static PendingIntent cambiarPeriodo(Context c, int id, int dias) {
        Intent i = new Intent(c, Widget.class).setAction(PERIODO).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
                .putExtra(DIAS, dias).putExtra(DISENO, DISENO_ACTUAL);
        int k = dias == 0 ? 7 : Datos.indicePeriodo(dias);
        return PendingIntent.getBroadcast(c, 1000 + id * 8 + k, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent refrescar(Context c) {
        Intent i = new Intent(c, Widget.class).setAction(REFRESCAR);
        return PendingIntent.getBroadcast(c, 3, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
