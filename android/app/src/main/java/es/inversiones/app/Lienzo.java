package es.inversiones.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Dibuja el widget entero en una imagen, con Manrope (la letra de la web) y con el mismo estilo que el patrimonio de
 * Cartera: la cifra grande y gruesa, lo de hoy en una pastilla de color y la curva suave con brillo y un relleno
 * dorado que se desvanece, de lado a lado. Así nada se corta: cada texto se mide y se encoge o se recorta con "…".
 * Tamaños: una fila (2x1, 4x1: la cifra, hoy y la curva a la derecha si cabe), dos filas (4x2: además lo ganado en
 * total y la curva grande) y tres o más (además lo que toca y, en pastillas, lo que más ha movido hoy la cartera).
 */
final class Lienzo {
    static final int PLANO = 0xFF1A1916, LINEA = 0xFF2A2723, TEXTO = 0xFFF1EDE5, TEXTO2 = 0xFFBDB6A8,
            APAGADO = 0xFF8E877A, ACENTO = 0xFFE2B45F, SUBE = 0xFF4FC995, BAJA = 0xFFEF7461,
            FONDO_A = 0xFF100F0D, FONDO_B = 0xFF060605;
    private static final float ESPACIADO_CIFRA = -0.045f;   // la cifra grande, apretada como en la web
    private static final Map<Integer, Typeface> LETRAS = new HashMap<>();

    private final Context ctx;
    private final float s;   // píxeles por dp
    private final Canvas c;
    private final Bitmap bmp;
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);

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
                t = new Typeface.Builder(ctx.getAssets(), "manrope.ttf").setFontVariationSettings("'wght' " + peso).build();
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
        while (sp > minSp && ancho(entero, sp, 700, ESPACIADO_CIFRA) + ancho(resto, sp * 0.42f, 600) + 3 > maxW) sp -= 0.5f;
        texto(x, yBase, entero, sp, 700, TEXTO, false, ESPACIADO_CIFRA);
        texto(x + ancho(entero, sp, 700, ESPACIADO_CIFRA) + 3, yBase, resto, sp * 0.42f, 600, TEXTO2, false);
        return sp;
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

    /**
     * la curva del periodo entre (x0, y0) y (x1, y1), en dp; el relleno baja hasta «suelo». Con «entra», lo de la
     * izquierda aparece poco a poco (la curva pequeña de una fila no empieza de golpe).
     */
    private void grafica(float x0, float y0, float x1, float y1, float suelo, double[] serie, boolean ref, boolean entra) {
        if (serie == null || serie.length < 2 || x1 - x0 < 30 || y1 - y0 < 16) return;
        double lo = Double.MAX_VALUE, hi = -Double.MAX_VALUE;
        for (double v : serie) {
            lo = Math.min(lo, v);
            hi = Math.max(hi, v);
        }
        if (hi - lo < 1e-9) hi = lo + 1;
        double rango = hi - lo;
        lo -= rango * 0.18;
        hi += rango * 0.08;
        int n = serie.length;
        float[] xs = new float[n], ys = new float[n];
        float arriba = Float.MAX_VALUE;
        for (int k = 0; k < n; k++) {
            xs[k] = dp(x0 + (x1 - x0) * k / (float) (n - 1));
            ys[k] = dp((float) (y1 - (y1 - y0) * (serie[k] - lo) / (hi - lo)));
            arriba = Math.min(arriba, ys[k]);
        }
        Path curva = curvaSuave(xs, ys);
        // el relleno sigue plano hasta el borde derecho, para que no acabe en un corte
        Path relleno = new Path(curva);
        relleno.lineTo(bmp.getWidth(), ys[n - 1]);
        relleno.lineTo(bmp.getWidth(), dp(suelo));
        relleno.lineTo(xs[0], dp(suelo));
        relleno.close();

        int capa = entra ? c.saveLayer(null, null) : c.save();
        p.reset();
        p.setAntiAlias(true);
        p.setStyle(Paint.Style.FILL);
        p.setShader(new LinearGradient(0, arriba, 0, dp(suelo), alfa(ACENTO, 0x4D), alfa(ACENTO, 0), Shader.TileMode.CLAMP));
        c.drawPath(relleno, p);
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
        p.setColor(alfa(ACENTO, 0x78));
        p.setStrokeWidth(dp(6));
        p.setMaskFilter(new BlurMaskFilter(dp(4), BlurMaskFilter.Blur.NORMAL));
        c.drawPath(curva, p);
        p.setMaskFilter(null);
        p.setColor(ACENTO);
        p.setStrokeWidth(dp(2.2f));
        c.drawPath(curva, p);

        // el punto de ahora, con su halo
        p.setStyle(Paint.Style.FILL);
        p.setColor(alfa(ACENTO, 0x3C));
        c.drawCircle(xs[n - 1], ys[n - 1], dp(7), p);
        p.setColor(ACENTO);
        c.drawCircle(xs[n - 1], ys[n - 1], dp(3.4f), p);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(dp(1.6f));
        p.setColor(FONDO_B);
        c.drawCircle(xs[n - 1], ys[n - 1], dp(3.4f), p);

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

    /** el periodo de la curva arriba, en una pastilla con su flecha: al tocarlo cambia (lo hace Widget) */
    static boolean conPeriodo(float W, float H, Datos.Resultado r) {
        return r.hay && H >= 110 && W >= 240 && r.serie != null && r.serie.length > 1 && !r.rango.isEmpty();
    }

    private void periodo(float xDer, float base, String txt) {
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
    }

    private void refresco(float cx, float cy, float r) {
        p.reset();
        p.setAntiAlias(true);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(dp(1.6f));
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setColor(APAGADO);
        c.drawArc(new RectF(dp(cx - r), dp(cy - r), dp(cx + r), dp(cy + r)), -60, 310, false, p);
        double a = Math.toRadians(-60);
        float ex = (float) (cx + r * Math.cos(a)), ey = (float) (cy + r * Math.sin(a));
        Path flecha = new Path();
        flecha.moveTo(dp(ex + 2.6f), dp(ey - 0.5f));
        flecha.lineTo(dp(ex - 1.2f), dp(ey - 3.4f));
        flecha.lineTo(dp(ex - 0.8f), dp(ey + 2.4f));
        flecha.close();
        p.setStyle(Paint.Style.FILL);
        c.drawPath(flecha, p);
    }

    // ---------- el widget ----------
    private void todo(float W, float H, Datos.Resultado r) {
        fondo();
        c.save();
        recortarAlMarco();
        float ph = W >= 200 ? 16 : 14, pv = H >= 110 ? 14 : 11;
        float util = W - 2 * ph;
        if (!r.hay) {
            texto(ph, H / 2 - 2, "GrowFolio", Math.min(22, H * 0.22f), 700, TEXTO, false);
            texto(ph, H / 2 + 18, recortar("Abre la app una vez para ver aquí tu cartera", 12.5f, 500, util), 12.5f, 500, TEXTO2, false);
            c.restore();
            return;
        }
        boolean hayGraf = r.serie != null && r.serie.length > 1;
        String diaEur = r.oculto ? Datos.pct(r.diaPct) : Datos.eur(r.dia, true);
        String diaPct = r.oculto ? "" : Datos.pct(r.diaPct);

        if (H < 110) {   // una fila: la cifra y hoy a la izquierda; la curva, a la derecha hasta el borde
            float izq = W < 250 ? util : util * 0.56f;
            float yb = H / 2 + 2;
            numero(r, ph, yb, izq, Math.min(30, H * 0.38f), 15);
            String hoyTxt = diaEur + (diaPct.isEmpty() ? "" : "  " + diaPct) + " hoy";
            if (ancho(hoyTxt, 12, 650) > izq) hoyTxt = diaEur + " hoy";
            texto(ph, yb + 19, recortar(hoyTxt, 12, 650, izq), 12, 650, color(r.dia), false);
            if (W >= 250) grafica(ph + izq + 12, pv + 4, W - 12, H - pv - 2, H, r.serie, false, true);
            c.restore();
            return;
        }

        // cabecera: qué es, la hora de los precios y refrescar
        float y = pv + 11;
        texto(ph, y, "Patrimonio", 12, 600, APAGADO, false);
        refresco(W - ph - 6, y - 4.2f, 6.2f);
        texto(W - ph - 19, y, r.horaTxt, 11.5f, 500, APAGADO, true);
        if (conPeriodo(W, H, r)) periodo(W - ph - 19 - ancho(r.horaTxt, 11.5f, 500) - 10, y, r.rango);

        // la cifra grande y gruesa
        float maxSp = Math.max(26, Math.min(42, Math.min(H * 0.2f, W * 0.115f)));
        float yb = y + 8 + maxSp * 0.92f;
        numero(r, ph, yb, util, maxSp, 18);

        // lo de hoy en su pastilla y «hoy» al lado: es la única cifra que cambia (nada de «en total» ni del mes)
        float yp = yb + 9;
        float wP = pildora(ph, yp, 24, diaEur, diaPct, color(r.dia), r.dia >= 0);
        if (ancho("hoy", 12.5f, 500) <= util - wP - 8) texto(ph + wP + 9, yp + 16.5f, "hoy", 12.5f, 500, APAGADO, false);
        y = yp + 24;

        // abajo, según el alto: lo que toca y lo que más ha movido hoy la cartera (en pastillas, como en la app)
        List<List<Pastilla>> filas = new ArrayList<>();
        if (H >= 230) filas = pastillas(r, util, H >= 270 ? 2 : 1);
        List<String> toca = new ArrayList<>();
        if (H >= 330 && !r.toca.isEmpty()) toca = lineas("Ahora: " + r.toca + (r.cuando.isEmpty() ? "" : ", " + r.cuando), 13, 500, util, H >= 380 ? 2 : 1);
        float altoToca = toca.isEmpty() ? 0 : 14 + 18 * toca.size();
        float altoFilas = filas.isEmpty() ? 0 : 25 + 31 * filas.size();
        boolean hayAbajo = altoToca + altoFilas > 0;
        float suelo = hayAbajo ? H - pv - altoToca - altoFilas - 8 : H;
        float graf1 = suelo - (hayAbajo ? 12 : 10);   // abajo ya no va la etiqueta del periodo (está arriba)
        if (hayGraf) grafica(0, y + 10, W - 12, graf1, suelo, r.serie, true, false);
        else if (graf1 - y - 10 >= 24) {   // aún sin datos del mes: una línea tenue y qué hacer
            float ym = (y + 10 + graf1) / 2;
            p.reset();
            p.setAntiAlias(true);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1, dp(1)));
            p.setColor(alfa(APAGADO, 0x60));
            p.setPathEffect(new DashPathEffect(new float[]{dp(3), dp(3)}, 0));
            c.drawLine(dp(ph), dp(ym), dp(W - ph), dp(ym), p);
            p.setPathEffect(null);
            String aviso = recortar("La gráfica se carga al refrescar", 11.5f, 500, util - 24);
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
            texto(ph, yy, "Lo que más ha movido hoy tu cartera", 11.5f, 600, APAGADO, false);
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
                if (k == 0 && l.startsWith("Ahora:")) {
                    texto(ph, yy, "Ahora:", 13, 700, ACENTO, false);
                    texto(ph + ancho("Ahora: ", 13, 700), yy, l.substring(Math.min(l.length(), 7)), 13, 500, TEXTO2, false);
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
        // el triángulo dibujado (Manrope no trae ▲ ni ▼)
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
