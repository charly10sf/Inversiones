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
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
    /** los precios del radar y de los fondos del catálogo (para los avisos de lo que añadiste a mano) */
    static final String AVISOS = "https://raw.githubusercontent.com/charly10sf/Inversiones/datos/avisos.json";
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
            JSONObject intra = j.optJSONObject("i");   // los precios de cada 30 minutos, para las 24 horas y la semana
            if (intra != null && intra.length() > 0) e.putString("intradia", intra.toString());
            e.apply();
            return true;
        } catch (Exception e) {
            return false;
        } finally {
            if (con != null) con.disconnect();
        }
    }

    /** Solo para los avisos: precios del radar (r: {símbolo: [precio en €, % del día]}) y del catálogo de fondos
     *  (c: {id: [precio, anterior]}). Como mucho una vez cada 20 minutos. */
    static void descargarAvisos(Context c) {
        SharedPreferences p = prefs(c);
        if (System.currentTimeMillis() - p.getLong("avisos_bajado_t", 0) < 20 * 60000L) return;
        HttpURLConnection con = null;
        try {
            con = (HttpURLConnection) new URL(AVISOS + "?t=" + (System.currentTimeMillis() / 60000)).openConnection();
            con.setConnectTimeout(8000);
            con.setReadTimeout(10000);
            con.setRequestProperty("Cache-Control", "no-cache");
            if (con.getResponseCode() != 200) return;
            InputStream in = con.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] b = new byte[8192];
            int n;
            while ((n = in.read(b)) > 0) out.write(b, 0, n);
            JSONObject j = new JSONObject(out.toString("UTF-8"));
            SharedPreferences.Editor e = p.edit().putLong("avisos_bajado_t", System.currentTimeMillis());
            if (j.optJSONObject("r") != null) e.putString("radar_p", j.getJSONObject("r").toString());
            if (j.optJSONObject("c") != null) e.putString("cat_p", j.getJSONObject("c").toString());
            e.apply();
        } catch (Exception e) {
            // la próxima vez
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
        long[] tiempos;      // cuándo es cada punto de la curva (para la escala de abajo); null si no se sabe
        boolean porTiempo;   // 24 horas: cada punto en su hora (si no, uno tras otro, sin las noches ni los findes)
        int dias = 31;       // el plazo elegido
        List<Mov> movs = new ArrayList<>();
    }

    /** los plazos de la curva del widget, en días (1 son las últimas 24 horas), y cómo se llaman */
    static final int[] PERIODOS = {1, 7, 31, 92, 365};
    static final String[] CORTOS = {"24 h", "1S", "1M", "3M", "1A"};
    static String nombrePeriodo(int dias) {
        return dias <= 1 ? "24 h" : dias <= 7 ? "1 semana" : dias <= 31 ? "1 mes" : dias <= 92 ? "3 meses" : "1 año";
    }
    static int indicePeriodo(int dias) {
        for (int k = 0; k < PERIODOS.length; k++) if (PERIODOS[k] == dias) return k;
        return 2;
    }

    static Resultado calcular(Context c) {
        return calcular(c, 31);
    }

    static Resultado calcular(Context c, int dias) {
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
            r.dias = dias;
            r.rango = nombrePeriodo(dias);
            JSONArray se = f.optJSONArray("serie");
            boolean ok = false;
            try {
                JSONObject cierres = new JSONObject(p.getString("cierres", "{}"));
                // 24 horas y la semana, con los precios de cada 30 minutos; si no los hay, la semana día a día
                if (dias <= 7) ok = serieIntradia(r, new JSONObject(p.getString("intradia", "{}")), cierres, dias);
                if (!ok && dias > 1) ok = seriePropia(r, cierres, dias);
            } catch (Exception e) {
                ok = false;
            }
            // la del widget va al día aunque no abras la app; la de la web (del mes), de reserva
            if (!ok && dias == 31 && se != null && se.length() > 1) {
                r.serie = new double[se.length()];
                for (int k = 0; k < se.length(); k++) r.serie[k] = se.optDouble(k);
                r.serie[r.serie.length - 1] = r.total;   // el último punto, con los precios de ahora
                r.tiempos = null;
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
    static boolean seriePropia(Resultado r, JSONObject cierres, int dias) {
        if (cierres == null || cierres.length() == 0) return false;
        List<Mov> movs = r.movs;
        double total = r.total;
        String desde = LocalDate.now().minusDays(dias).toString(), hoy = LocalDate.now().toString();
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
        if (conHist.isEmpty() || fechas.size() < 2) return false;
        // el año, semana a semana (el último día de cada una): con un punto por día la curva sería ruido
        if (dias > 120) {
            TreeSet<String> semanal = new TreeSet<>();
            String ant = null;
            for (String d : fechas) {
                if (ant != null && LocalDate.parse(d).get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR) != LocalDate.parse(ant).get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR)) semanal.add(ant);
                ant = d;
            }
            if (ant != null) semanal.add(ant);
            if (semanal.size() >= 2) fechas = semanal;
        }
        List<Double> out = new ArrayList<>();
        List<Long> cuando = new ArrayList<>();
        ZoneId zona = ZoneId.systemDefault();
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
            if (!Double.isNaN(v)) {
                out.add(v);
                cuando.add(LocalDate.parse(d.substring(0, 10)).atTime(12, 0).atZone(zona).toInstant().toEpochMilli());
            }
            ultima = d;
        }
        if (hoy.equals(ultima) && !out.isEmpty()) {
            out.set(out.size() - 1, total);
            cuando.set(cuando.size() - 1, System.currentTimeMillis());
        } else {
            out.add(total);
            cuando.add(System.currentTimeMillis());
        }
        if (out.size() < 2) return false;
        r.serie = new double[out.size()];
        r.tiempos = new long[out.size()];
        for (int k = 0; k < out.size(); k++) {
            r.serie[k] = out.get(k);
            r.tiempos[k] = cuando.get(k);
        }
        r.porTiempo = false;
        return true;
    }

    /**
     * Las últimas 24 horas (cada punto en su hora) o la semana (un punto cada 30 minutos, sin las horas sin mercado),
     * como la gráfica de 1 día y 1 semana de la web: cada posición con su precio de ese momento; las que no cotizan
     * durante el día (los fondos), con su valor liquidativo de ese día; el efectivo y lo que no tiene cantidad, fijos.
     * El último punto es el valor de ahora.
     */
    static boolean serieIntradia(Resultado r, JSONObject intra, JSONObject cierres, int dias) {
        long ahora = System.currentTimeMillis(), desde = ahora - dias * 86400000L;
        boolean porTiempo = dias <= 1;
        ZoneId zona = ZoneId.systemDefault();
        List<Mov> its = new ArrayList<>();
        List<long[]> tI = new ArrayList<>();
        List<double[]> pI = new ArrayList<>();
        List<String[]> fD = new ArrayList<>();
        List<double[]> pD = new ArrayList<>();
        TreeSet<Long> marcas = new TreeSet<>();
        double fijo = r.total;
        boolean alguno = false;
        for (Mov m : r.movs) {
            if (Double.isNaN(m.uds) || m.uds == 0 || m.id == null || m.id.isEmpty()) continue;
            JSONArray a = intra == null ? null : intra.optJSONArray(m.id);
            JSONArray d = cierres == null ? null : cierres.optJSONArray(m.id);
            int na = a == null ? 0 : a.length(), nd = d == null ? 0 : d.length();
            if (na == 0 && nd == 0) continue;
            long[] t = new long[na];
            double[] pr = new double[na];
            int n = 0;
            for (int k = 0; k < na; k++) {
                JSONArray x = a.optJSONArray(k);
                if (x == null) continue;
                double v = x.optDouble(1);
                if (Double.isNaN(v)) continue;
                try {
                    t[n] = OffsetDateTime.parse(x.optString(0)).toInstant().toEpochMilli();
                } catch (Exception e) {
                    continue;
                }
                pr[n] = v;
                if (t[n] > desde && t[n] <= ahora) marcas.add(t[n]);
                n++;
            }
            String[] f = new String[nd];
            double[] pf = new double[nd];
            for (int k = 0; k < nd; k++) {
                JSONArray x = d.optJSONArray(k);
                f[k] = x == null ? "" : x.optString(0);
                pf[k] = x == null ? Double.NaN : x.optDouble(1);
            }
            if (n > 0) alguno = true;
            its.add(m);
            tI.add(java.util.Arrays.copyOf(t, n));
            pI.add(java.util.Arrays.copyOf(pr, n));
            fD.add(f);
            pD.add(pf);
            fijo -= m.valor;
        }
        if (its.isEmpty() || (!porTiempo && !alguno)) return false;
        List<Long> T = new ArrayList<>();
        if (porTiempo) T.add(desde);
        for (Long t : marcas) if (ahora - t > 120000L) T.add(t);   // lo de hace menos de 2 minutos ya es «ahora»
        if (!porTiempo && T.isEmpty()) return false;
        int n = T.size() + 1;
        r.serie = new double[n];
        r.tiempos = new long[n];
        int[] ia = new int[its.size()];
        for (int j = 0; j < T.size(); j++) {
            long t = T.get(j);
            String fecha = Instant.ofEpochMilli(t).atZone(zona).toLocalDate().toString();
            double s = fijo;
            for (int i = 0; i < its.size(); i++) {
                long[] ti = tI.get(i);
                double[] pi = pI.get(i);
                while (ia[i] < ti.length && ti[ia[i]] <= t) ia[i]++;
                double precio = ia[i] > 0 ? pi[ia[i] - 1] : cierreHasta(fD.get(i), pD.get(i), fecha);
                if (Double.isNaN(precio)) precio = pi.length > 0 ? pi[0] : its.get(i).valor / its.get(i).uds;
                s += its.get(i).uds * precio;
            }
            r.serie[j] = s;
            r.tiempos[j] = t;
        }
        r.serie[n - 1] = r.total;
        r.tiempos[n - 1] = ahora;
        r.porTiempo = porTiempo;
        return n >= 2;
    }

    /** el último cierre de ese día o de antes (NaN si no hay) */
    private static double cierreHasta(String[] fechas, double[] precios, String fecha) {
        double v = Double.NaN;
        for (int k = 0; k < fechas.length; k++) {
            if (fechas[k].compareTo(fecha) > 0) break;
            if (!Double.isNaN(precios[k])) v = precios[k];
        }
        return v;
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
