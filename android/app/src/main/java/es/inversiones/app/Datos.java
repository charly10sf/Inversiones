package es.inversiones.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.TreeSet;

/**
 * Lo que enseña el widget. Dos fuentes:
 * - la foto que manda la web cada vez que está abierta (total, hoy, cantidades de cada posición, lo que toca);
 * - widget.json, que publica la Action cada 20 minutos con el precio de cada posición: con él se recalcula
 *   el valor sin abrir la app (cantidades de la foto por precios nuevos). Trae también los cierres de las
 *   últimas semanas, y con ellos el widget dibuja él solo la gráfica del mes, sin depender de la web.
 * Todo se guarda en el almacenamiento privado de la app; nunca la contraseña de la cartera.
 */
final class Datos {
    static final String PRECIOS = "https://raw.githubusercontent.com/charly10sf/Inversiones/datos/widget.json";
    private static final String PREFS = "widget";

    private Datos() {}

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** al cerrar la sesión: el widget vuelve a «Abre la app» y no enseña la cartera de nadie */
    static void borrar(Context c) {
        prefs(c).edit().remove("foto").remove("foto_t").apply();
    }

    static void guardarFoto(Context c, String json) {
        prefs(c).edit().putString("foto", json).putLong("foto_t", System.currentTimeMillis()).apply();
    }

    /** Baja los precios de la Action. Devuelve true si ha podido. */
    static boolean descargar(Context c) {
        HttpURLConnection con = null;
        try {
            con = (HttpURLConnection) new URL(PRECIOS + "?t=" + (System.currentTimeMillis() / 60000)).openConnection();
            con.setConnectTimeout(8000);
            con.setReadTimeout(8000);
            con.setRequestProperty("Cache-Control", "no-cache");
            if (con.getResponseCode() != 200) return false;
            InputStream in = con.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] b = new byte[8192];
            int n;
            while ((n = in.read(b)) > 0) out.write(b, 0, n);
            JSONObject j = new JSONObject(out.toString("UTF-8"));
            long t = OffsetDateTime.parse(j.getString("generado")).toInstant().toEpochMilli();
            SharedPreferences.Editor e = prefs(c).edit().putString("precios", j.getJSONObject("p").toString()).putLong("precios_t", t).putLong("bajado_t", System.currentTimeMillis());
            JSONObject h = j.optJSONObject("h");
            if (h != null && h.length() > 0) e.putString("cierres", h.toString());
            e.apply();
            return true;
        } catch (Exception e) {
            return false;
        } finally {
            if (con != null) con.disconnect();
        }
    }

    /** ¿Hace falta bajar los precios? (nunca bajados, sin los cierres de la gráfica o de hace más de 20 minutos) */
    static boolean viejos(Context c) {
        SharedPreferences p = prefs(c);
        return !p.contains("cierres") || System.currentTimeMillis() - p.getLong("bajado_t", 0) > 20 * 60000L;
    }

    static final class Mov {
        String nombre, id;
        double valor, dia, uds = Double.NaN;
    }

    static final class Resultado {
        boolean hay, oculto, conPrecios;
        double total, dia, diaPct, pl, plPct;
        String toca = "", cuando = "", rango = "", horaTxt = "";
        long hora;
        double[] serie;
        List<Mov> movs = new ArrayList<>();
    }

    static Resultado calcular(Context c) {
        Resultado r = new Resultado();
        SharedPreferences p = prefs(c);
        String fotoTxt = p.getString("foto", null);
        if (fotoTxt == null) return r;
        try {
            JSONObject f = new JSONObject(fotoTxt);
            long fotoT = p.getLong("foto_t", 0);
            long preciosT = p.getLong("precios_t", 0);
            JSONObject pr = new JSONObject(p.getString("precios", "{}"));
            boolean nuevos = preciosT > fotoT;   // solo si los precios son posteriores a la última vez que abriste la app
            r.hay = true;
            r.oculto = f.optBoolean("oculto", false);
            r.toca = f.optString("toca", "");
            r.cuando = f.optString("cuando", "");
            double totalPos = 0, dia = 0;
            JSONArray pos = f.optJSONArray("pos");
            for (int k = 0; pos != null && k < pos.length(); k++) {
                JSONObject x = pos.getJSONObject(k);
                double valor = x.optDouble("valor", 0), d = x.optDouble("dia", 0);
                JSONArray q = nuevos ? pr.optJSONArray(x.optString("id")) : null;
                if (q != null && x.has("uds") && !Double.isNaN(q.optDouble(0))) {
                    double precio = q.optDouble(0), anterior = q.optDouble(1, Double.NaN);
                    valor = x.optDouble("uds") * precio;
                    d = Double.isNaN(anterior) || anterior <= 0 ? d : x.optDouble("uds") * (precio - anterior);
                    r.conPrecios = true;
                }
                totalPos += valor;
                dia += d;
                Mov m = new Mov();
                m.nombre = x.optString("n");
                m.id = x.optString("id");
                if (x.has("uds")) m.uds = x.optDouble("uds");
                m.valor = valor;
                m.dia = d;
                r.movs.add(m);
            }
            r.total = totalPos + f.optDouble("fijo", 0);
            r.dia = dia;
            r.diaPct = r.total - dia != 0 ? dia / (r.total - dia) * 100 : 0;
            double inv = f.optDouble("invertido", 0);
            r.pl = totalPos - inv;
            r.plPct = inv > 0 ? (totalPos / inv - 1) * 100 : 0;
            r.hora = r.conPrecios ? preciosT : fotoT;
            r.horaTxt = new java.text.SimpleDateFormat("HH:mm", new Locale("es", "ES")).format(new java.util.Date(r.hora));
            r.rango = f.optString("rango", "");
            JSONArray se = f.optJSONArray("serie");
            double[] propia = null;
            try {
                propia = seriePropia(new JSONObject(p.getString("cierres", "{}")), r.movs, r.total);
            } catch (Exception e) {
                propia = null;
            }
            if (propia != null) {   // la del widget va al día aunque no abras la app; la de la web, de reserva
                r.serie = propia;
                if (r.rango.isEmpty()) r.rango = "1 mes";
            } else if (se != null && se.length() > 1) {
                r.serie = new double[se.length()];
                for (int k = 0; k < se.length(); k++) r.serie[k] = se.optDouble(k);
                r.serie[r.serie.length - 1] = r.total;   // el último punto, con los precios de ahora
            }
            Collections.sort(r.movs, (a, b) -> Double.compare(Math.abs(b.dia), Math.abs(a.dia)));
        } catch (Exception e) {
            r.hay = false;
        }
        return r;
    }

    /**
     * El valor de tus posiciones de hoy con los cierres de cada día del último mes (como la gráfica de la web):
     * cantidad de cada posición por su cierre de ese día, y lo que no cotiza (efectivo, fondos sin cantidad)
     * fijo. El último punto es el valor de ahora.
     */
    static double[] seriePropia(JSONObject cierres, List<Mov> movs, double total) {
        if (cierres == null || cierres.length() == 0) return null;
        String desde = LocalDate.now().minusDays(31).toString(), hoy = LocalDate.now().toString();
        List<Mov> conHist = new ArrayList<>();
        List<JSONArray> hs = new ArrayList<>();
        TreeSet<String> fechas = new TreeSet<>();
        double fijo = total;
        for (Mov m : movs) {
            JSONArray h = Double.isNaN(m.uds) || m.id == null ? null : cierres.optJSONArray(m.id);
            if (h == null || h.length() == 0) continue;
            conHist.add(m);
            hs.add(h);
            fijo -= m.valor;
            for (int k = 0; k < h.length(); k++) {
                String d = h.optJSONArray(k).optString(0);
                if (d.compareTo(desde) >= 0 && d.compareTo(hoy) <= 0) fechas.add(d);
            }
        }
        if (conHist.isEmpty() || fechas.size() < 2) return null;
        List<Double> out = new ArrayList<>();
        int[] idx = new int[hs.size()];
        double[] ult = new double[hs.size()];
        for (int i = 0; i < hs.size(); i++) ult[i] = hs.get(i).optJSONArray(0).optDouble(1);   // por si empieza después
        String ultima = null;
        for (String d : fechas) {
            double v = fijo;
            for (int i = 0; i < hs.size(); i++) {
                JSONArray h = hs.get(i);
                while (idx[i] < h.length() && h.optJSONArray(idx[i]).optString(0).compareTo(d) <= 0) {
                    ult[i] = h.optJSONArray(idx[i]).optDouble(1);
                    idx[i]++;
                }
                v += conHist.get(i).uds * ult[i];
            }
            if (!Double.isNaN(v)) out.add(v);
            ultima = d;
        }
        if (hoy.equals(ultima) && !out.isEmpty()) out.set(out.size() - 1, total);
        else out.add(total);
        if (out.size() < 2) return null;
        double[] r = new double[out.size()];
        for (int k = 0; k < r.length; k++) r[k] = out.get(k);
        return r;
    }

    // ---------- números en español: 79.952 €, −0,07 % ----------
    private static DecimalFormat formato(String patron) {
        DecimalFormatSymbols s = new DecimalFormatSymbols(new Locale("es", "ES"));
        s.setGroupingSeparator('.');
        s.setDecimalSeparator(',');
        DecimalFormat f = new DecimalFormat(patron, s);
        f.setGroupingUsed(true);
        f.setGroupingSize(3);
        return f;
    }

    static String eur(double v, boolean signo) {
        String t = formato("#,##0").format(Math.abs(Math.round(v)));
        String s = v < -0.5 ? "−" : signo && v >= 0.5 ? "+" : "";
        return s + t + " €";
    }

    static String pct(double v) {
        String t = formato(Math.abs(v) < 10 ? "0.00" : "0.0").format(Math.abs(v));
        return (v < -0.0049 ? "−" : v > 0.0049 ? "+" : "") + t + " %";
    }

    /** con un decimal, como en las etiquetas de la app: +1,2 % */
    static String pct1(double v) {
        String t = formato("0.0").format(Math.abs(v));
        return (v < -0.049 ? "−" : v > 0.049 ? "+" : "") + t + "\u00a0%";
    }
}
