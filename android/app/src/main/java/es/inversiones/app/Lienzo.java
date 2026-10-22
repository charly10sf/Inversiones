package es.inversiones.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapShader;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.ComposeShader;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Dibuja el widget entero en una imagen, con Plus Jakarta Sans (la letra de la web) y con el mismo estilo que el patrimonio de
 * Cartera: la cifra grande y gruesa, lo de hoy en una pastilla de color y la curva suave con brillo y un relleno
 * dorado que se desvanece, de lado a lado. Así nada se corta: cada texto se mide y se encoge o se recorta con "…".
 * Tamaños: una fila (2x1, 4x1: la cifra, hoy y la curva a la derecha si cabe), dos filas (4x2: además lo ganado en
 * total y la curva grande) y tres o más (además lo que toca y, en pastillas, lo que más ha movido hoy la cartera).
 */
final class Lienzo {
    static final int PLANO = 0xFF1A1916, LINEA = 0xFF2A2723, TEXTO = 0xFFF7F2E8, TEXTO2 = 0xFFBCB3A2,
            APAGADO = 0xFF8A8172, ACENTO = 0xFFEDBB45, SUBE = 0xFF4CBF8E, BAJA = 0xFFE46A5C,
            FONDO_A = 0xFF100F0D, FONDO_B = 0xFF060605;
    private static final float ESPACIADO_CIFRA = -0.06f;   // la cifra grande, gruesa y apretada como en la app (0.3)
    private static final int PESO_CIFRA = 750;
    private static final Map<Integer, Typeface> LETRAS = new HashMap<>();

    private final Context ctx;
    private final float s;   // píxeles por dp
    private final Canvas c;
    private final Bitmap bmp;
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
    private float ph = 16;   // el margen de los lados, en dp (lo pone todo())

    private Lienzo(Context ctx, Bitmap bmp, float s) {
        this.ctx = ctx;
        this.bmp = bmp;
        this.s = s;
        this.c = new Canvas(bmp);
    }

    /** ancho y alto en dp; devuelve la imagen ya dibujada */
    static Bitmap dibujar(Context ctx, float W, float H, Datos.Resultado r) {
        float densidad = ctx.getResources().getDisplayMetrics().density;
        float s = Math.min(densidad, Math.min(3f, 1400f / Math.max(W, 1)));
        Bitmap b = Bitmap.createBitmap(Math.max(1, Math.round(W * s)), Math.max(1, Math.round(H * s)), Bitmap.Config.ARGB_8888);
        Lienzo l = new Lienzo(ctx, b, s);
        l.todo(W, H, r);
        return b;
    }

    // ---------- letra y texto ----------
    private Typeface letra(int peso) {
        Typeface t = LETRAS.get(peso);
        if (t == null) {
            try {
                t = new Typeface.Builder(ctx.getAssets(), "plusjakartasans.ttf").setFontVariationSettings("'wght' " + peso).build();
            } catch (Exception e) {
                t = null;
            }
            if (t == null) t = Typeface.create("sans-serif", peso >= 600 ? Typeface.BOLD : Typeface.NORMAL);
            LETRAS.put(peso, t);
        }
        return t;
    }

    private float dp(float v) {
        return v * s;
    }

    private void estilo(float sp, int peso, int color, Paint.Align ancla) {
        estilo(sp, peso, color, ancla, 0);
    }

    private void estilo(float sp, int peso, int color, Paint.Align ancla, float espaciado) {
        p.setAntiAlias(true);
        p.setSubpixelText(true);
        p.setShader(null);
        p.setPathEffect(null);
        p.setMaskFilter(null);
        p.setXfermode(null);
        p.setLetterSpacing(espaciado);
        p.setStyle(Paint.Style.FILL);
        p.setTypeface(letra(peso));
        p.setTextSize(dp(sp));
        p.setColor(color);
        p.setTextAlign(ancla);
    }

    /** ancho de un texto, en dp */
    private float ancho(String t, float sp, int peso) {
        return ancho(t, sp, peso, 0);
    }

    private float ancho(String t, float sp, int peso, float espaciado) {
        estilo(sp, peso, TEXTO, Paint.Align.LEFT, espaciado);
        return p.measureText(t) / s;
    }

    private void texto(float x, float yBase, String t, float sp, int peso, int color, boolean derecha) {
        texto(x, yBase, t, sp, peso, color, derecha, 0);
    }

    private void texto(float x, float yBase, String t, float sp, int peso, int color, boolean derecha, float espaciado) {
        estilo(sp, peso, color, derecha ? Paint.Align.RIGHT : Paint.Align.LEFT, espaciado);
        c.drawText(t, dp(x), dp(yBase), p);
    }

    private static int alfa(int color, int a) {
        return (color & 0x00FFFFFF) | (a << 24);
    }

    private String recortar(String t, float sp, int peso, float maxW) {
        if (ancho(t, sp, peso) <= maxW) return t;
        while (t.length() > 1 && ancho(t + "…", sp, peso) > maxW) t = t.substring(0, t.length() - 1);
        return t.trim() + "…";
    }

    private List<String> lineas(String t, float sp, int peso, float maxW, int n) {
        List<String> out = new ArrayList<>();
        String cur = "";
        String[] pal = t.split(" +");
        int k = 0;
        for (; k < pal.length; k++) {
            String prueba = cur.isEmpty() ? pal[k] : cur + " " + pal[k];
            if (ancho(prueba, sp, peso) <= maxW) cur = prueba;
            else {
                out.add(cur);
                cur = pal[k];
                if (out.size() == n) break;
            }
        }
        if (out.size() < n && !cur.isEmpty()) out.add(cur);
        if (k < pal.length && !out.isEmpty()) out.set(out.size() - 1, recortar(out.get(out.size() - 1) + "…", sp, peso, maxW));
        return out;
    }

    private static int color(double v) {
        return v > 0.5 ? SUBE : v < -0.5 ? BAJA : TEXTO2;
    }

    // ---------- piezas ----------
    /** el patrimonio: los euros grandes y gruesos, los céntimos pequeños, encogiendo la letra hasta que quepa */
    private float numero(Datos.Resultado r, float x, float yBase, float maxW, float maxSp, float minSp) {
        String entero, resto;
        if (r.oculto) {
            entero = "•••••";
            resto = " €";
        } else {
            long centimos = Math.round(Math.abs(r.total) * 100);   // así 79.952,996 sale 79.953,00 y no 79.952,100
            String e = Datos.eur(centimos / 100, false);
            int k = e.indexOf(' ');
            entero = (r.total < 0 ? "−" : "") + (k > 0 ? e.substring(0, k) : e);
            long cents = centimos % 100;
            resto = "," + (cents < 10 ? "0" : "") + cents + " €";
        }
        float sp = maxSp;
        while (sp > minSp && ancho(entero, sp, PESO_CIFRA, ESPACIADO_CIFRA) + ancho(resto, sp * 0.4f, 600) + 3 > maxW) sp -= 0.5f;
        texto(x, yBase, entero, sp, PESO_CIFRA, TEXTO, false, ESPACIADO_CIFRA);
        texto(x + ancho(entero, sp, PESO_CIFRA, ESPACIADO_CIFRA) + 3, yBase, resto, sp * 0.4f, 600, TEXTO2, false);
        return sp;
    }

    private static Bitmap GRANO;
    private static Bitmap grano() {
        if (GRANO != null) return GRANO;
        try {
            int l = 128;
            int[] px = new int[l * l];
            Random r = new Random(7);
            for (int i = 0; i < px.length; i++) {
                float a = Math.max(0f, Math.min(1f, r.nextFloat() * 2.2f - 0.95f));
                px[i] = ((int) (a * 255) << 24) | (236 << 16) | (192 << 8) | 112;
            }
            GRANO = Bitmap.createBitmap(px, l, l, Bitmap.Config.ARGB_8888);
        } catch (Throwable e) {
            GRANO = null;
        }
        return GRANO;
    }

    /** una curva suave que pasa por todos los puntos sin inventarse picos (Fritsch-Carlson), como en la web */
    private static Path curvaSuave(float[] xs, float[] ys) {
        int n = xs.length;
        Path c = new Path();
        c.moveTo(xs[0], ys[0]);
        if (n < 3) {
            for (int k = 1; k < n; k++) c.lineTo(xs[k], ys[k]);
            return c;
        }
        float[] dx = new float[n - 1], m = new float[n - 1], t = new float[n];
        for (int i = 0; i < n - 1; i++) {
            dx[i] = xs[i + 1] - xs[i];
            m[i] = dx[i] != 0 ? (ys[i + 1] - ys[i]) / dx[i] : 0;
        }
        t[0] = m[0];
        for (int i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
        t[n - 1] = m[n - 2];
        for (int i = 0; i < n - 1; i++) {
            if (m[i] == 0) {
                t[i] = 0;
                t[i + 1] = 0;
                continue;
            }
            float a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
            if (h > 9) {
                float k = (float) (3 / Math.sqrt(h));
                t[i] = k * a * m[i];
                t[i + 1] = k * b * m[i];
            }
        }
        for (int i = 0; i < n - 1; i++) {
            float h = dx[i] / 3;
            c.cubicTo(xs[i] + h, ys[i] + t[i] * h, xs[i + 1] - h, ys[i + 1] - t[i + 1] * h, xs[i + 1], ys[i + 1]);
        }
        return c;
    }

    private static final String[] DIAS = {"lun", "mar", "mié", "jue", "vie", "sáb", "dom"};
    private static final String[] MESES = {"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"};
    private static final String[] DIAS_EN = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
    private static final String[] MESES_EN = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};

    /** un paso redondo (1, 2 o 5 por una potencia de 10) para que haya unas «quiero» líneas en el rango */
    private static double pasoRedondo(double rango, int quiero) {
        double x = Math.max(1e-9, rango / Math.max(1, quiero)), mag = Math.pow(10, Math.floor(Math.log10(x))), f = x / mag;
        return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
    }

    /** el valor de una línea de la escala: «80.000 €» o, con la cartera oculta, «+2 %» desde el principio */
    private static String etiquetaY(double v, double paso, boolean enPct) {
        if (!enPct) return Datos.eur(v, false);
        String t = new java.text.DecimalFormat(paso >= 1 ? "0" : "0.0", new java.text.DecimalFormatSymbols(new java.util.Locale("es", "ES"))).format(Math.abs(v));
        boolean cero = Math.abs(v) < paso / 2;
        return (cero ? "" : v < 0 ? "−" : "+") + (cero ? "0" : t) + " %";
    }

    /** texto con un borde oscuro, para que la escala se lea encima de la curva y el relleno */
    private void textoEscala(float x, float yBase, String t, Paint.Align ancla, int color) {
        estilo(10, 600, FONDO_B, ancla);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(dp(3));
        p.setStrokeJoin(Paint.Join.ROUND);
        p.setAlpha(0xB8);
        c.drawText(t, dp(x), dp(yBase), p);
        estilo(10, 600, color, ancla);
        c.drawText(t, dp(x), dp(yBase), p);
    }

    /**
     * la curva del periodo entre (x0, y0) y (x1, y1), en dp; el relleno baja hasta «suelo». Con «entra», lo de la
     * izquierda aparece poco a poco (la curva pequeña de una fila no empieza de golpe). Con «ejes», la escala:
     * unas líneas tenues con su valor y, abajo, las horas (24 h), los días (la semana), las semanas (el mes) o los meses.
     */
    private void grafica(float x0, float y0, float x1, float y1, float suelo, Datos.Resultado r, boolean ref, boolean entra, boolean ejes) {
        double[] serie = r.serie;
        if (serie == null || serie.length < 2 || x1 - x0 < 30 || y1 - y0 < 16) return;
        double lo = Double.MAX_VALUE, hi = -Double.MAX_VALUE;
        for (double v : serie) {
            lo = Math.min(lo, v);
            hi = Math.max(hi, v);
        }
        if (hi - lo < 1e-9) hi = lo + 1;
        double rango = hi - lo;
        lo -= rango * 0.12;
        hi += rango * 0.05;
        int n = serie.length;
        long[] tt = r.tiempos != null && r.tiempos.length == n ? r.tiempos : null;
        boolean porHora = r.porTiempo && tt != null && tt[n - 1] > tt[0];
        float[] xs = new float[n], ys = new float[n];
        float arriba = Float.MAX_VALUE;
        for (int k = 0; k < n; k++) {
            float fx = porHora ? (tt[k] - tt[0]) / (float) (tt[n - 1] - tt[0]) : k / (float) (n - 1);
            xs[k] = dp(x0 + (x1 - x0) * fx);
            ys[k] = dp((float) (y1 - (y1 - y0) * (serie[k] - lo) / (hi - lo)));
            arriba = Math.min(arriba, ys[k]);
        }

        // la escala: dónde van las líneas (y) y las marcas de abajo (x), en dp
        List<Float> yL = new ArrayList<>(), xM = new ArrayList<>();
        List<String> yT = new ArrayList<>(), xT = new ArrayList<>();
        if (ejes) {
            double base = serie[0];
            boolean enPct = r.oculto || base <= 0;
            double a = enPct ? (lo / base - 1) * 100 : lo, b = enPct ? (hi / base - 1) * 100 : hi;
            float alto = y1 - y0;
            double paso = pasoRedondo(b - a, alto < 64 ? 2 : alto < 120 ? 3 : 4);
            String antes = "";
            for (long k = (long) Math.ceil(a / paso); k <= (long) Math.floor(b / paso); k++) {
                double v = k * paso, val = enPct ? base * (1 + v / 100) : v;
                float y = (float) (y1 - (y1 - y0) * (val - lo) / (hi - lo));
                String t = etiquetaY(v, paso, enPct);
                if (y < y0 + 10 || y > y1 - 3 || t.equals(antes)) continue;
                yL.add(y);
                yT.add(t);
                antes = t;
            }
            // las marcas de abajo: candidatas y luego, de izquierda a derecha, las que caben sin pisarse
            List<Float> cx = new ArrayList<>();
            List<String> ct = new ArrayList<>();
            if (tt != null) {
                ZoneId z = ZoneId.systemDefault();
                if (porHora) {   // cada 6 horas en punto
                    ZonedDateTime m = Instant.ofEpochMilli(tt[0]).atZone(z).truncatedTo(ChronoUnit.HOURS).plusHours(1);
                    while (m.getHour() % 6 != 0) m = m.plusHours(1);
                    for (; m.toInstant().toEpochMilli() < tt[n - 1]; m = m.plusHours(6)) {
                        cx.add(x0 + (x1 - x0) * (m.toInstant().toEpochMilli() - tt[0]) / (float) (tt[n - 1] - tt[0]));
                        ct.add(String.format(java.util.Locale.ROOT, "%02d:00", m.getHour()));
                    }
                } else {
                    for (int k = 1; k < n; k++) {
                        LocalDate da = Instant.ofEpochMilli(tt[k - 1]).atZone(z).toLocalDate(), db = Instant.ofEpochMilli(tt[k]).atZone(z).toLocalDate();
                        String t = null;
                        if (r.dias <= 7) {
                            if (!db.equals(da)) t = (r.en ? DIAS_EN : DIAS)[db.getDayOfWeek().getValue() - 1];
                        } else if (r.dias <= 31) {
                            if (db.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR) != da.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)) t = r.en ? MESES_EN[db.getMonthValue() - 1] + " " + db.getDayOfMonth() : db.getDayOfMonth() + " " + MESES[db.getMonthValue() - 1];
                        } else if (db.getMonthValue() != da.getMonthValue() && (r.dias <= 92 || db.getMonthValue() % 3 == 1)) {
                            // en el año, solo los trimestres (ene, abr, jul, oct) y enero con su año: «2026»
                            t = r.dias > 92 && db.getMonthValue() == 1 ? String.valueOf(db.getYear()) : (r.en ? MESES_EN : MESES)[db.getMonthValue() - 1];
                        }
                        if (t != null) {
                            cx.add(x0 + (x1 - x0) * k / (float) (n - 1));
                            ct.add(t);
                        }
                    }
                }
            }
            float der = -1e9f;
            for (int k = 0; k < cx.size(); k++) {
                float w = ancho(ct.get(k), 10, 600), l = cx.get(k) - w / 2;
                if (l < ph || cx.get(k) + w / 2 > x1 - 14 || l < der + 12) continue;
                xM.add(cx.get(k));
                xT.add(ct.get(k));
                der = cx.get(k) + w / 2;
            }
        }
        Path curva = curvaSuave(xs, ys);
        // el relleno sigue plano hasta el borde derecho, para que no acabe en un corte
        Path relleno = new Path(curva);
        relleno.lineTo(bmp.getWidth(), ys[n - 1]);
        relleno.lineTo(bmp.getWidth(), dp(suelo));
        relleno.lineTo(xs[0], dp(suelo));
        relleno.close();

        int capa = entra ? c.saveLayer(null, null) : c.save();
        // la rejilla, por debajo de todo: muy tenue, para dar la escala sin quitarle protagonismo a la curva
        if (!yL.isEmpty() || !xM.isEmpty()) {
            p.reset();
            p.setAntiAlias(true);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1, dp(0.8f)));
            p.setColor(alfa(TEXTO, 0x14));
            for (float y : yL) c.drawLine(dp(x0), dp(y), dp(x1), dp(y), p);
            p.setColor(alfa(TEXTO, 0x0E));
            for (float x : xM) c.drawLine(dp(x), dp(y0 - 4), dp(x), dp(suelo - 17), p);
        }
        p.reset();
        p.setAntiAlias(true);
        p.setStyle(Paint.Style.FILL);
        p.setShader(new LinearGradient(0, arriba, 0, dp(suelo), alfa(ACENTO, 0x45), alfa(ACENTO, 0), Shader.TileMode.CLAMP));
        c.drawPath(relleno, p);
        // el grano, como en la app: puntitos dorados sueltos, densos junto a la curva y que se apagan hacia abajo
        Bitmap gr = grano();
        if (gr != null) {
            Shader g = new BitmapShader(gr, Shader.TileMode.REPEAT, Shader.TileMode.REPEAT);
            Shader m = new LinearGradient(0, arriba, 0, dp(suelo), new int[]{0xE6FFFFFF, 0x33FFFFFF, 0x00FFFFFF}, new float[]{0f, 0.7f, 1f}, Shader.TileMode.CLAMP);
            p.setShader(new ComposeShader(g, m, PorterDuff.Mode.DST_IN));
            c.drawPath(relleno, p);
        }
        p.setShader(null);

        // dónde empezó el periodo, muy tenue
        if (ref) {
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1, dp(1)));
            p.setColor(alfa(APAGADO, 0x6E));
            p.setPathEffect(new DashPathEffect(new float[]{dp(2), dp(4)}, 0));
            c.drawLine(dp(x0), ys[0], dp(x1), ys[0], p);
            p.setPathEffect(null);
        }

        // el brillo de debajo y la curva
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeJoin(Paint.Join.ROUND);
        p.setStrokeCap(Paint.Cap.ROUND);
        Shader trazo = new LinearGradient(dp(x0), 0, dp(x1), 0, new int[]{alfa(ACENTO, 0x80), ACENTO, 0xFFF9DE9C}, new float[]{0f, 0.7f, 1f}, Shader.TileMode.CLAMP);
        p.setColor(0xFFFFFFFF);
        p.setShader(trazo);
        p.setAlpha(0x73);
        p.setStrokeWidth(dp(9));
        p.setMaskFilter(new BlurMaskFilter(dp(5), BlurMaskFilter.Blur.NORMAL));
        c.drawPath(curva, p);
        p.setMaskFilter(null);
        p.setAlpha(0xFF);
        p.setStrokeWidth(dp(2.6f));
        c.drawPath(curva, p);
        p.setShader(null);

        // el punto de ahora, con su halo de luz y un haz fino hasta el suelo, como en la app
        float hx = xs[n - 1], hy = ys[n - 1], hr = Math.max(dp(14), Math.min(dp(40), (dp(suelo) - arriba) * 0.35f));
        p.setStyle(Paint.Style.FILL);
        p.setShader(new RadialGradient(hx, hy, hr, alfa(ACENTO, 0x47), alfa(ACENTO, 0), Shader.TileMode.CLAMP));
        c.drawCircle(hx, hy, hr, p);
        p.setShader(new LinearGradient(0, hy + dp(4), 0, dp(suelo), alfa(ACENTO, 0x8C), alfa(ACENTO, 0), Shader.TileMode.CLAMP));
        c.drawRect(hx - dp(0.6f), hy + dp(4), hx + dp(0.6f), dp(suelo), p);
        p.setShader(null);
        p.setColor(alfa(ACENTO, 0x3C));
        c.drawCircle(xs[n - 1], ys[n - 1], dp(7), p);
        p.setColor(ACENTO);
        c.drawCircle(xs[n - 1], ys[n - 1], dp(3.4f), p);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(dp(1.6f));
        p.setColor(FONDO_B);
        c.drawCircle(xs[n - 1], ys[n - 1], dp(3.4f), p);

        // los valores de la escala, encima: a la izquierda los de las líneas y abajo las horas o las fechas
        for (int k = 0; k < yL.size(); k++) textoEscala(ph, yL.get(k) - 3.5f, yT.get(k), Paint.Align.LEFT, alfa(TEXTO2, 0xC8));
        for (int k = 0; k < xM.size(); k++) textoEscala(xM.get(k), suelo - 7, xT.get(k), Paint.Align.CENTER, alfa(APAGADO, 0xE6));

        if (entra) {   // lo de la izquierda se funde con el fondo
            Paint m = new Paint();
            m.setShader(new LinearGradient(dp(x0), 0, dp(x0 + 34), 0, 0x00000000, 0xFF000000, Shader.TileMode.CLAMP));
            m.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.DST_IN));
            c.drawRect(dp(x0) - 2, 0, dp(x0 + 34), bmp.getHeight(), m);
        }
        c.restoreToCount(capa);
    }

    /** lo de hoy en una pastilla de color, como en Cartera: el triángulo, los euros y el % más suave; devuelve el ancho */
    private float pildora(float x, float yTop, float alto, String eur, String pct, int color, boolean sube) {
        float sp = alto >= 24 ? 13 : 11.5f;
        float w = 10 + 7 + 6 + ancho(eur, sp, 700) + (pct.isEmpty() ? 0 : 6 + ancho(pct, sp, 600)) + 11;
        p.reset();
        p.setAntiAlias(true);
        p.setStyle(Paint.Style.FILL);
        p.setColor(alfa(color, 0x2E));
        c.drawRoundRect(new RectF(dp(x), dp(yTop), dp(x + w), dp(yTop + alto)), dp(alto / 2), dp(alto / 2), p);
        float cx = x + 10 + 3.5f, cy = yTop + alto / 2;
        Path tri = new Path();
        if (sube) {
            tri.moveTo(dp(cx), dp(cy - 3));
            tri.lineTo(dp(cx + 3.5f), dp(cy + 2.6f));
            tri.lineTo(dp(cx - 3.5f), dp(cy + 2.6f));
        } else {
            tri.moveTo(dp(cx), dp(cy + 3));
            tri.lineTo(dp(cx + 3.5f), dp(cy - 2.6f));
            tri.lineTo(dp(cx - 3.5f), dp(cy - 2.6f));
        }
        tri.close();
        p.setColor(color);
        c.drawPath(tri, p);
        float base = yTop + alto / 2 + sp * 0.36f, tx = x + 10 + 7 + 6;
        texto(tx, base, eur, sp, 700, color, false);
        tx += ancho(eur, sp, 700) + 6;
        if (!pct.isEmpty()) texto(tx, base, pct, sp, 600, alfa(color, 0xCC), false);
        return w;
    }

    /** el fondo: oscuro de arriba abajo, con un halo dorado muy tenue arriba a la izquierda (como el patrimonio) */
    private void fondo() {
        RectF caja = new RectF(0, 0, bmp.getWidth(), bmp.getHeight());
        p.reset();
        p.setAntiAlias(true);
        p.setShader(new LinearGradient(0, 0, 0, bmp.getHeight(), FONDO_A, FONDO_B, Shader.TileMode.CLAMP));
        c.drawRoundRect(caja, dp(24), dp(24), p);
        p.setShader(new RadialGradient(0, 0, Math.max(1, Math.max(bmp.getWidth() * 0.85f, bmp.getHeight() * 1.1f)), alfa(ACENTO, 0x21), alfa(ACENTO, 0), Shader.TileMode.CLAMP));
        c.drawRoundRect(caja, dp(24), dp(24), p);
        p.setShader(null);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(Math.max(1, dp(1)));
        p.setColor(LINEA);
        c.drawRoundRect(new RectF(dp(0.5f), dp(0.5f), bmp.getWidth() - dp(0.5f), bmp.getHeight() - dp(0.5f)), dp(24), dp(24), p);
    }

    /** lo que se dibuja dentro (la curva de lado a lado) no se sale de las esquinas redondeadas */
    private void recortarAlMarco() {
        Path marco = new Path();
        marco.addRoundRect(new RectF(dp(1), dp(1), bmp.getWidth() - dp(1), bmp.getHeight() - dp(1)), dp(23), dp(23), Path.Direction.CW);
        c.clipPath(marco);
    }

    /**
     * cómo se elige el plazo de la curva, arriba: 2, los cinco a la vista (24 h, 1S, 1M, 3M, 1A) y se toca el que
     * quieras; 1, si el widget es estrecho, una pastilla que pasa al siguiente; 0, sin elegir (una fila o muy pequeño).
     * Van arriba a la derecha, junto a refrescar. Las zonas que se tocan están en widget_lienzo.xml (ancladas a la
     * derecha): si cambias SEL_FIN, SEL_CHIP o el número de plazos, cámbialas allí también.
     */
    static int modoPlazo(float W, float H, Datos.Resultado r) {
        if (!r.hay || H < 110) return 0;
        return W >= 300 ? 2 : W >= 240 ? 1 : 0;
    }

    static final float SEL_FIN = 38, SEL_CHIP = 34, SEL_ALTO = 22;   // SEL_FIN: del final de los plazos al borde derecho

    /** los plazos en una cápsula: el elegido, en dorado sobre su pastilla; los demás, apagados */
    private void selector(int elegido, float x0, float yTop) {
        int n = Datos.PERIODOS.length;
        float w = SEL_CHIP * n;
        p.reset();
        p.setAntiAlias(true);
        p.setStyle(Paint.Style.FILL);
        p.setColor(alfa(TEXTO, 0x0F));
        c.drawRoundRect(new RectF(dp(x0), dp(yTop), dp(x0 + w), dp(yTop + SEL_ALTO)), dp(SEL_ALTO / 2), dp(SEL_ALTO / 2), p);
        float xs = x0 + SEL_CHIP * elegido;
        RectF on = new RectF(dp(xs + 2), dp(yTop + 2), dp(xs + SEL_CHIP - 2), dp(yTop + SEL_ALTO - 2));
        p.setColor(alfa(ACENTO, 0x2E));
        c.drawRoundRect(on, dp(SEL_ALTO / 2 - 2), dp(SEL_ALTO / 2 - 2), p);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(Math.max(1, dp(0.8f)));
        p.setColor(alfa(ACENTO, 0x59));
        c.drawRoundRect(on, dp(SEL_ALTO / 2 - 2), dp(SEL_ALTO / 2 - 2), p);
        for (int k = 0; k < n; k++) {
            boolean es = k == elegido;
            estilo(11, es ? 750 : 600, es ? ACENTO : APAGADO, Paint.Align.CENTER);
            c.drawText(Datos.CORTOS[k], dp(x0 + SEL_CHIP * k + SEL_CHIP / 2), dp(yTop + SEL_ALTO / 2 + 3.9f), p);
        }
    }

    /**
     * lo que ha cambiado la cartera en el plazo de la curva, entre «desde» y «hasta» (en dp), alineado a la derecha:
     * «+1.230 € +1,6 % en 1 mes»; si no cabe, sin los euros; si ni así, nada. Con la cartera oculta, solo el %
     */
    private void variacion(Datos.Resultado r, float desde, float hasta, float base) {
        double[] s = r.serie;
        double v = s[s.length - 1] - s[0], pc = s[0] != 0 ? (s[s.length - 1] / s[0] - 1) * 100 : 0;
        int col = Math.abs(pc) < 0.005 ? TEXTO2 : pc > 0 ? SUBE : BAJA;
        String eur = r.oculto ? "" : Datos.eur(v, true), pct = Datos.pct(pc), etq = (r.en ? "in " : "en ") + r.rango;
        float wEtq = ancho(etq, 12.5f, 500), wPct = ancho(pct, 12, 600), wEur = eur.isEmpty() ? 0 : ancho(eur, 13, 700);
        float libre = hasta - desde;
        boolean conEur = !eur.isEmpty() && wEur + 5 + wPct + 6 + wEtq <= libre;
        if (!conEur && wPct + 6 + wEtq > libre) return;
        float x = hasta - wEtq;
        texto(x, base, etq, 12.5f, 500, APAGADO, false);
        x -= 6 + wPct;
        texto(x, base, pct, 12, 600, alfa(col, 0xCC), false);
        if (conEur) texto(x - 5 - wEur, base, eur, 13, 700, col, false);
    }

    /** la pastilla del plazo de los widgets estrechos, acabando en xDer; devuelve su ancho */
    private float periodo(float xDer, float base, String txt) {
        float tw = ancho(txt, 11.5f, 600), w = 10 + tw + 5 + 7 + 9, alto = 22, yTop = base - 15;
        float x = xDer - w;
        p.reset();
        p.setAntiAlias(true);
        p.setStyle(Paint.Style.FILL);
        p.setColor(alfa(TEXTO, 0x12));
        c.drawRoundRect(new RectF(dp(x), dp(yTop), dp(xDer), dp(yTop + alto)), dp(alto / 2), dp(alto / 2), p);
        texto(x + 10, base, txt, 11.5f, 600, TEXTO2, false);
        // la flecha hacia abajo, dibujada
        float cx = x + 10 + tw + 5 + 3.5f, cy = yTop + alto / 2 + 0.5f;
        Path f = new Path();
        f.moveTo(dp(cx - 3.2f), dp(cy - 1.6f));
        f.lineTo(dp(cx), dp(cy + 1.8f));
        f.lineTo(dp(cx + 3.2f), dp(cy - 1.6f));
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(dp(1.4f));
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);
        p.setColor(APAGADO);
        c.drawPath(f, p);
        return w;
    }

    // ---------- el widget ----------
    private void todo(float W, float H, Datos.Resultado r) {
        fondo();
        c.save();
        recortarAlMarco();
        float ph = W >= 200 ? 16 : 14, pv = H >= 110 ? 14 : 11;
        this.ph = ph;
        float util = W - 2 * ph;
        if (!r.hay) {
            texto(ph, H / 2 - 2, "GrowFolio", Math.min(22, H * 0.22f), 700, TEXTO, false);
            texto(ph, H / 2 + 18, recortar(r.en ? "Open the app once to see your portfolio here" : "Abre la app una vez para ver aquí tu cartera", 12.5f, 500, util), 12.5f, 500, TEXTO2, false);
            c.restore();
            return;
        }
        boolean hayGraf = r.serie != null && r.serie.length > 1;
        String diaEur = r.oculto ? Datos.pct(r.diaPct) : Datos.eurDia(r.dia);
        String diaPct = r.oculto ? "" : Datos.pct(r.diaPct);

        if (H < 110) {   // una fila: la cifra y hoy a la izquierda; la curva, a la derecha hasta el borde
            float izq = W < 250 ? util : util * 0.56f;
            float yb = H / 2 + 2;
            numero(r, ph, yb, izq, Math.min(30, H * 0.38f), 15);
            String hoyW = r.en ? " today" : " hoy";
            String hoyTxt = diaEur + (diaPct.isEmpty() ? "" : "  " + diaPct) + hoyW;
            if (ancho(hoyTxt, 12, 650) > izq) hoyTxt = diaEur + hoyW;
            texto(ph, yb + 19, recortar(hoyTxt, 12, 650, izq), 12, 650, color(r.dia), false);
            if (W >= 250) grafica(ph + izq + 12, pv + 4, W - 12, H - pv - 2, H, r, false, true, false);
            c.restore();
            return;
        }

        // cabecera: a la derecha, los plazos de la curva junto a refrescar; a la izquierda, «Patrimonio» y la hora de
        // los precios (lo que quepa)
        float y = pv + 11;
        int modo = modoPlazo(W, H, r);
        // la rueda de refrescar ya no se dibuja aquí: es una vista de widget_lienzo.xml, para que pueda girar
        float finIzq = W - ph - 26;
        if (modo == 2) {
            float x0 = W - SEL_FIN - SEL_CHIP * Datos.PERIODOS.length;
            selector(Datos.indicePeriodo(r.dias), x0, y - 15);
            finIzq = x0 - 10;
        } else if (modo == 1) finIzq = W - SEL_FIN - periodo(W - SEL_FIN, y, r.rango) - 10;
        String pat = r.en ? "Net worth" : "Patrimonio";
        float wPat = ancho(pat, 12, 600), wHora = ancho(r.horaTxt, 11.5f, 500);
        if (ph + wPat + 7 + wHora <= finIzq) {
            texto(ph, y, pat, 12, 600, APAGADO, false);
            texto(ph + wPat + 7, y, r.horaTxt, 11.5f, 500, alfa(APAGADO, 0xB0), false);
        } else if (ph + wHora <= finIzq) texto(ph, y, r.horaTxt, 11.5f, 500, alfa(APAGADO, 0xB0), false);

        // la cifra grande y gruesa
        float maxSp = Math.max(26, Math.min(42, Math.min(H * 0.2f, W * 0.115f)));
        float yb = y + 8 + maxSp * 0.92f;
        numero(r, ph, yb, util, maxSp, 18);

        // lo de hoy en su pastilla y «hoy» al lado: es la única cifra que cambia (nada de «en total» ni del mes)
        float yp = yb + 9;
        int colHoy = r.dia > 0.005 ? SUBE : r.dia < -0.005 ? BAJA : TEXTO2;
        float wP = pildora(ph, yp, 24, diaEur, diaPct, colHoy, r.dia >= 0);
        float finHoy = ph + wP;
        String hoyP = r.en ? "today" : "hoy";
        if (ancho(hoyP, 12.5f, 500) <= util - wP - 8) {
            texto(ph + wP + 9, yp + 16.5f, hoyP, 12.5f, 500, APAGADO, false);
            finHoy = ph + wP + 9 + ancho(hoyP, 12.5f, 500);
        }
        // y a la derecha, lo que ha cambiado en el plazo de la curva («+1.230 € +1,6 % en 1 mes»), si cabe
        if (hayGraf && modo > 0) variacion(r, finHoy + 16, W - ph, yp + 16.5f);
        y = yp + 24;

        // abajo, según el alto: lo que toca y lo que más ha movido hoy la cartera (en pastillas, como en la app)
        List<List<Pastilla>> filas = new ArrayList<>();
        if (H >= 230) filas = pastillas(r, util, H >= 270 ? 2 : 1);
        List<String> toca = new ArrayList<>();
        if (H >= 330 && !r.toca.isEmpty()) toca = lineas((r.en ? "Now: " : "Ahora: ") + r.toca + (r.cuando.isEmpty() ? "" : ", " + r.cuando), 13, 500, util, H >= 380 ? 2 : 1);
        float altoToca = toca.isEmpty() ? 0 : 14 + 18 * toca.size();
        float altoFilas = filas.isEmpty() ? 0 : 25 + 31 * filas.size();
        boolean hayAbajo = altoToca + altoFilas > 0;
        float suelo = hayAbajo ? H - pv - altoToca - altoFilas - 8 : H;
        // con sitio, la escala: abajo van las horas o las fechas, así que la curva se queda algo más arriba
        boolean ejes = W >= 160 && suelo - y - 10 >= 62;
        float graf1 = suelo - (ejes ? 25 : hayAbajo ? 12 : 10);
        if (hayGraf) grafica(0, y + 10, W - 12, graf1, suelo, r, true, false, ejes);
        else if (graf1 - y - 10 >= 24) {   // aún sin datos de ese plazo: una línea tenue y qué hacer
            float ym = (y + 10 + graf1) / 2;
            p.reset();
            p.setAntiAlias(true);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1, dp(1)));
            p.setColor(alfa(APAGADO, 0x60));
            p.setPathEffect(new DashPathEffect(new float[]{dp(3), dp(3)}, 0));
            c.drawLine(dp(ph), dp(ym), dp(W - ph), dp(ym), p);
            p.setPathEffect(null);
            String aviso = recortar(r.dias <= 1 ? (r.en ? "No prices for the last 24 h yet" : "Aún no hay precios de las últimas 24 h") : (r.en ? "The chart loads on refresh" : "La gráfica se carga al refrescar"), 11.5f, 500, util - 24);
            float wa = ancho(aviso, 11.5f, 500);
            p.reset();
            p.setColor(FONDO_B);
            c.drawRect(dp(W / 2 - wa / 2 - 8), dp(ym - 9), dp(W / 2 + wa / 2 + 8), dp(ym + 9), p);
            texto(W / 2 - wa / 2, ym + 4, aviso, 11.5f, 500, APAGADO, false);
        }


        float yy = suelo + 4;
        if (!filas.isEmpty()) {
            p.reset();
            p.setColor(LINEA);
            p.setStrokeWidth(Math.max(1, dp(1)));
            c.drawLine(dp(ph), dp(yy), dp(W - ph), dp(yy), p);
            yy += 18;
            texto(ph, yy, r.en ? "What moved your portfolio most today" : "Lo que más ha movido hoy tu cartera", 11.5f, 600, APAGADO, false);
            yy += 7;
            for (List<Pastilla> linea : filas) {
                float x = ph;
                for (Pastilla t : linea) {
                    pastilla(t, x, yy);
                    x += t.w + 6;
                }
                yy += 31;
            }
            yy += 2;
        }
        if (!toca.isEmpty()) {
            p.reset();
            p.setColor(LINEA);
            p.setStrokeWidth(Math.max(1, dp(1)));
            c.drawLine(dp(ph), dp(yy), dp(W - ph), dp(yy), p);
            yy += 18;
            for (int k = 0; k < toca.size(); k++) {
                String l = toca.get(k);
                String ya = r.en ? "Now:" : "Ahora:";
                if (k == 0 && l.startsWith(ya)) {
                    texto(ph, yy, ya, 13, 700, ACENTO, false);
                    texto(ph + ancho(ya + " ", 13, 700), yy, l.substring(Math.min(l.length(), ya.length() + 1)), 13, 500, TEXTO2, false);
                } else texto(ph, yy, l, 13, 500, TEXTO2, false);
                yy += 18;
            }
        }
        c.restore();
    }

    // ---------- lo que más ha movido hoy: pastillas de color ----------
    private static final float ALTO_P = 25;

    private static final class Pastilla {
        String nombre, eur, pct;
        int color;
        boolean sube;
        float w, fs = 12.5f, fsp = 11;
        boolean tri = true;   // el triángulo: si no cabe, se quita antes que recortar el nombre (el color ya dice si sube)
    }

    private float anchoPastilla(Pastilla t) {
        return (t.tri ? 9 + 7 + 5 : 11) + ancho(t.nombre, t.fs, 650) + (t.eur.isEmpty() ? 0 : 5 + ancho(t.eur, t.fs, 650)) + (t.pct.isEmpty() ? 0 : 5 + ancho(t.pct, t.fsp, 550)) + 10;
    }

    /**
     * las cuatro posiciones que más han movido hoy la cartera (como mínimo 1 €), en una rejilla de dos columnas
     * iguales si cabe (una si el widget es estrecho). Euros y % siempre: si no cabe, primero la letra un poco más
     * pequeña, luego se recorta el nombre y, solo si ni así, se quita el %
     */
    private List<List<Pastilla>> pastillas(Datos.Resultado r, float util, int maxLineas) {
        int cols = util >= 300 ? 2 : 1;
        float colW = (util - 6 * (cols - 1)) / cols;
        List<Pastilla> todas = new ArrayList<>();
        for (Datos.Mov m : r.movs) {
            if (todas.size() == Math.min(4, cols * maxLineas) || Math.abs(m.dia) < 1) break;   // van ordenadas de más a menos
            Pastilla t = new Pastilla();
            double pc = m.valor - m.dia != 0 ? m.dia / (m.valor - m.dia) * 100 : 0;
            t.sube = m.dia > 0;
            t.color = t.sube ? SUBE : BAJA;
            t.eur = r.oculto ? "" : Datos.eur(m.dia, true);
            t.pct = Datos.pct1(pc);
            t.nombre = m.nombre;
            t.w = colW;
            todas.add(t);
        }
        // todas igual: si alguna no cabe, a todas la letra un poco más pequeña y, si aún no, sin el triángulo
        if (algunaNoCabe(todas, colW)) for (Pastilla t : todas) { t.fs = 11.5f; t.fsp = 10.5f; }
        if (algunaNoCabe(todas, colW)) for (Pastilla t : todas) t.tri = false;
        // y la que siga sin caber: se recorta el nombre y, si ni así, se quita su %
        for (Pastilla t : todas) {
            if (anchoPastilla(t) > colW) t.nombre = recortar(t.nombre, t.fs, 650, Math.max(40, ancho(t.nombre, t.fs, 650) - (anchoPastilla(t) - colW)));
            if (anchoPastilla(t) > colW && !t.eur.isEmpty()) t.pct = "";
            if (anchoPastilla(t) > colW) t.nombre = recortar(t.nombre, t.fs, 650, Math.max(24, ancho(t.nombre, t.fs, 650) - (anchoPastilla(t) - colW)));
        }
        List<List<Pastilla>> out = new ArrayList<>();
        for (int k = 0; k < todas.size(); k += cols) out.add(new ArrayList<>(todas.subList(k, Math.min(todas.size(), k + cols))));
        return out;
    }

    private boolean algunaNoCabe(List<Pastilla> l, float colW) {
        for (Pastilla t : l) if (anchoPastilla(t) > colW) return true;
        return false;
    }

    private void pastilla(Pastilla t, float x, float yTop) {
        p.reset();
        p.setAntiAlias(true);
        p.setStyle(Paint.Style.FILL);
        p.setColor(alfa(t.color, 0x2E));
        c.drawRoundRect(new RectF(dp(x), dp(yTop), dp(x + t.w), dp(yTop + ALTO_P)), dp(ALTO_P / 2), dp(ALTO_P / 2), p);
        // el triángulo, dibujado a mano para que quede igual en todos los tamaños
        float cx = x + 9 + 3.5f, cy = yTop + ALTO_P / 2;
        if (t.tri) {
            Path tri = new Path();
            if (t.sube) {
                tri.moveTo(dp(cx), dp(cy - 3));
                tri.lineTo(dp(cx + 3.5f), dp(cy + 2.6f));
                tri.lineTo(dp(cx - 3.5f), dp(cy + 2.6f));
            } else {
                tri.moveTo(dp(cx), dp(cy + 3));
                tri.lineTo(dp(cx + 3.5f), dp(cy - 2.6f));
                tri.lineTo(dp(cx - 3.5f), dp(cy - 2.6f));
            }
            tri.close();
            p.setColor(t.color);
            c.drawPath(tri, p);
        }
        float base = yTop + 17, tx = x + (t.tri ? 9 + 7 + 5 : 11);
        texto(tx, base, t.nombre, t.fs, 650, TEXTO, false);
        tx += ancho(t.nombre, t.fs, 650) + 5;
        if (!t.eur.isEmpty()) {
            texto(tx, base, t.eur, t.fs, 650, t.color, false);
            tx += ancho(t.eur, t.fs, 650) + 5;
        }
        if (!t.pct.isEmpty()) texto(tx, base, t.pct, t.fsp, 550, alfa(t.color, 0xD9), false);
    }
}
