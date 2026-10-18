package es.inversiones.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.ArrayMap;
import android.util.SizeF;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Map;

/**
 * El widget: 4x2 al ponerlo y se puede estirar. Pequeño (2x1): el total y hoy. Mediano (4x2): además lo
 * que llevas ganado y lo que toca hacer. Grande (4x3 o más): además lo que más se mueve hoy.
 * Se refresca solo cada 30 minutos (lo mínimo que deja Android), al tocar ↻ y cada vez que abres la app.
 */
public class Widget extends AppWidgetProvider {
    static final String REFRESCAR = "es.inversiones.app.REFRESCAR";
    private static final int SUBE = 0xFF4FC995, BAJA = 0xFFEF7461, NEUTRO = 0xFFBDB6A8;

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
        Datos.Resultado r = Datos.calcular(c);
        RemoteViews vista;
        if (Build.VERSION.SDK_INT >= 31) {
            Map<SizeF, RemoteViews> tamanos = new ArrayMap<>();
            tamanos.put(new SizeF(100f, 40f), rellenar(c, R.layout.widget_pequeno, r));
            tamanos.put(new SizeF(200f, 100f), rellenar(c, R.layout.widget_mediano, r));
            tamanos.put(new SizeF(200f, 185f), rellenar(c, R.layout.widget_grande, r));
            vista = new RemoteViews(tamanos);
        } else {
            Bundle o = m.getAppWidgetOptions(id);
            int ancho = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH), alto = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT);
            int capa = alto >= 185 ? R.layout.widget_grande : ancho >= 200 && alto >= 100 ? R.layout.widget_mediano : R.layout.widget_pequeno;
            vista = rellenar(c, capa, r);
        }
        m.updateAppWidget(id, vista);
    }

    private static RemoteViews rellenar(Context c, int capa, Datos.Resultado r) {
        RemoteViews v = new RemoteViews(c.getPackageName(), capa);
        v.setOnClickPendingIntent(android.R.id.background, abrir(c, "cartera", 1));
        boolean pequeno = capa == R.layout.widget_pequeno;
        if (!pequeno) {
            v.setOnClickPendingIntent(R.id.refrescar, refrescar(c));
            v.setOnClickPendingIntent(R.id.toca, abrir(c, "ruta", 2));
        }
        if (!r.hay) {
            v.setTextViewText(R.id.total, "Inversiones");
            v.setTextViewText(R.id.dia, "Abre la app");
            if (!pequeno) {
                v.setTextViewText(R.id.toca, "Abre la app una vez para que el widget tenga tus datos.");
                v.setTextViewText(R.id.ganancia, "");
                v.setTextViewText(R.id.hora, "");
            }
            if (capa == R.layout.widget_grande) for (int k = 1; k <= 4; k++) v.setViewVisibility(idMov(k, ""), android.view.View.GONE);
            return v;
        }
        v.setTextViewText(R.id.total, r.oculto ? "••••• €" : Datos.eur(r.total, false));
        String dia = r.oculto ? Datos.pct(r.diaPct) + " hoy" : Datos.eur(r.dia, true) + " (" + Datos.pct(r.diaPct) + ") hoy";
        v.setTextViewText(R.id.dia, dia);
        v.setTextColor(R.id.dia, color(r.dia));
        if (pequeno) return v;

        v.setTextViewText(R.id.ganancia, (r.oculto ? Datos.pct(r.plPct) : Datos.eur(r.pl, true) + " (" + Datos.pct(r.plPct) + ")") + " en total");
        v.setTextViewText(R.id.hora, new SimpleDateFormat("HH:mm", new Locale("es", "ES")).format(new Date(r.hora)));
        v.setTextViewText(R.id.toca, r.toca.isEmpty() ? "Nada urgente: deja trabajar tus aportaciones." : "Ahora: " + r.toca + (r.cuando.isEmpty() ? "" : ", " + r.cuando));

        if (capa == R.layout.widget_grande) {
            for (int k = 1; k <= 4; k++) {
                if (k > r.movs.size()) {
                    v.setViewVisibility(idMov(k, ""), android.view.View.GONE);
                    continue;
                }
                Datos.Mov x = r.movs.get(k - 1);
                double pct = x.valor - x.dia != 0 ? x.dia / (x.valor - x.dia) * 100 : 0;
                v.setViewVisibility(idMov(k, ""), android.view.View.VISIBLE);
                v.setTextViewText(idMov(k, "_n"), x.nombre);
                v.setTextViewText(idMov(k, "_v"), r.oculto ? "" : Datos.eur(x.dia, true));
                v.setTextColor(idMov(k, "_v"), color(x.dia));
                v.setTextViewText(idMov(k, "_p"), Datos.pct(pct));
                v.setTextColor(idMov(k, "_p"), color(x.dia));
            }
        }
        return v;
    }

    private static int idMov(int k, String sufijo) {
        switch (k * 10 + (sufijo.isEmpty() ? 0 : sufijo.equals("_n") ? 1 : sufijo.equals("_v") ? 2 : 3)) {
            case 10: return R.id.mov1;
            case 11: return R.id.mov1_n;
            case 12: return R.id.mov1_v;
            case 13: return R.id.mov1_p;
            case 20: return R.id.mov2;
            case 21: return R.id.mov2_n;
            case 22: return R.id.mov2_v;
            case 23: return R.id.mov2_p;
            case 30: return R.id.mov3;
            case 31: return R.id.mov3_n;
            case 32: return R.id.mov3_v;
            case 33: return R.id.mov3_p;
            case 40: return R.id.mov4;
            case 41: return R.id.mov4_n;
            case 42: return R.id.mov4_v;
            default: return R.id.mov4_p;
        }
    }

    private static int color(double v) {
        return v > 0.5 ? SUBE : v < -0.5 ? BAJA : NEUTRO;
    }

    private static PendingIntent abrir(Context c, String hash, int codigo) {
        Intent i = new Intent(c, Principal.class).putExtra("hash", hash).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, codigo, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent refrescar(Context c) {
        Intent i = new Intent(c, Widget.class).setAction(REFRESCAR);
        return PendingIntent.getBroadcast(c, 3, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
