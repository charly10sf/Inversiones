package es.inversiones.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Dibuja el widget entero en una imagen, con Manrope (la letra de la web) y la gráfica de la cartera.
 * Así nada se corta: cada texto se mide y se encoge o se recorta con "…" si no cabe.
 * Tamaños: una fila (2x1, 4x1: el total, hoy y una gráfica pequeña si cabe), dos filas (4x2: además lo
 * ganado en total y la gráfica grande) y tres o más (además lo que toca y, en pastillas de color como en la
 * app, lo que más ha movido hoy la cartera).
 */
final class Lienzo {
    static final int PLANO = 0xFF1A1916, LINEA = 0xFF2A2723, TEXTO = 0xFFF1EDE5, TEXTO2 = 0xFFBDB6A8,
            APAGADO = 0xFF8E877A, ACENTO = 0xFFE2B45F, SUBE = 0xFF4FC995, BAJA = 0xFFEF7461;
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
        p.setAntiAlias(true);
        p.setSubpixelText(true);
        p.setShader(null);
        p.setPathEffect(null);
        p.setStyle(Paint.Style.FILL);
        p.setTypeface(letra(peso));
        p.setTextSize(dp(sp));
        p.setColor(color);
        p.setTextAlign(ancla);
    }

    /** ancho de un texto, en dp */
    private float ancho(String t, float sp, int peso) {
        estilo(sp, peso, TEXTO, Paint.Align.LEFT);
        return p.measureText(t) / s;
    }

    private void texto(float x, float yBase, String t, float sp, int peso, int color, boolean derecha) {
        estilo(sp, peso, color, derecha ? Paint.Align.RIGHT : Paint.Align.LEFT);
        c.drawText(t, dp(x), dp(yBase), p);
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

    private static int colorPct(double v) {
        return v > 0.005 ? SUBE : v < -0.005 ? BAJA : TEXTO2;
    }

    // ---------- piezas ----------
    /** el patrimonio: los euros grandes y los céntimos pequeños, encogiendo la letra hasta que quepa */
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
        while (sp > minSp && ancho(entero, sp, 220) + ancho(resto, sp * 0.5f, 320) > maxW) sp -= 0.5f;
        texto(x, yBase, entero, sp, 220, TEXTO, false);
        texto(x + ancho(entero, sp, 220) + 1, yBase, resto, sp * 0.5f, 320, TEXTO2, false);
        return sp;
    }

    private void grafica(float x0, float y0, float x1, float y1, double[] serie) {
        if (serie == null || serie.length < 2 || x1 - x0 < 30 || y1 - y0 < 16) return;
        double lo = Double.MAX_VALUE, hi = -Double.MAX_VALUE;
        for (double v : serie) {
            lo = Math.min(lo, v);
            hi = Math.max(hi, v);
        }
        if (hi - lo < 1e-9) hi = lo + 1;
        double margen = (hi - lo) * 0.1;
        lo -= margen;
        hi += margen;
        int n = serie.length;
        float[] xs = new float[n], ys = new float[n];
        for (int k = 0; k < n; k++) {
            xs[k] = dp(x0 + (x1 - x0) * k / (float) (n - 1));
            ys[k] = dp((float) (y1 - (y1 - y0) * (serie[k] - lo) / (hi - lo)));
        }
        Path linea = new Path();
        linea.moveTo(xs[0], ys[0]);
        for (int k = 1; k < n; k++) linea.lineTo(xs[k], ys[k]);
        Path relleno = new Path(linea);
        relleno.lineTo(xs[n - 1], dp(y1));
        relleno.lineTo(xs[0], dp(y1));
        relleno.close();

        p.reset();
        p.setAntiAlias(true);
        p.setStyle(Paint.Style.FILL);
        p.setShader(new LinearGradient(0, dp(y0), 0, dp(y1), (ACENTO & 0x00FFFFFF) | 0x46000000, ACENTO & 0x00FFFFFF, Shader.TileMode.CLAMP));
        c.drawPath(relleno, p);
        p.setShader(null);

        // dónde empezó el periodo, en discontinua
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(Math.max(1, dp(1)));
        p.setColor((APAGADO & 0x00FFFFFF) | 0x96000000);
        p.setPathEffect(new DashPathEffect(new float[]{dp(3), dp(3)}, 0));
        c.drawLine(dp(x0), ys[0], dp(x1), ys[0], p);
        p.setPathEffect(null);

        p.setColor(ACENTO);
        p.setStrokeWidth(dp(2));
        p.setStrokeJoin(Paint.Join.ROUND);
        p.setStrokeCap(Paint.Cap.ROUND);
        c.drawPath(linea, p);

        p.setStyle(Paint.Style.FILL);
        p.setColor((ACENTO & 0x00FFFFFF) | 0x40000000);
        c.drawCircle(xs[n - 1], ys[n - 1], dp(5), p);
        p.setColor(ACENTO);
        c.drawCircle(xs[n - 1], ys[n - 1], dp(2.6f), p);
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
        p.reset();
        p.setAntiAlias(true);
        p.setColor(PLANO);
        c.drawRoundRect(new RectF(0, 0, bmp.getWidth(), bmp.getHeight()), dp(24), dp(24), p);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(Math.max(1, dp(1)));
        p.setColor(LINEA);
        c.drawRoundRect(new RectF(dp(0.5f), dp(0.5f), bmp.getWidth() - dp(0.5f), bmp.getHeight() - dp(0.5f)), dp(24), dp(24), p);

        float ph = W >= 200 ? 16 : 14, pv = H >= 110 ? 14 : 10;
        float util = W - 2 * ph;
        if (!r.hay) {
            texto(ph, H / 2 - 2, "GrowFolio", Math.min(22, H * 0.22f), 300, TEXTO, false);
            texto(ph, H / 2 + 18, recortar("Abre la app una vez para ver aquí tu cartera", 12.5f, 500, util), 12.5f, 500, TEXTO2, false);
            return;
        }
        String diaTxt = (r.oculto ? Datos.pct(r.diaPct) : Datos.eur(r.dia, true) + " (" + Datos.pct(r.diaPct) + ")") + " hoy";
        boolean hayGraf = r.serie != null && r.serie.length > 1;
        double rangoPct = hayGraf && r.serie[0] != 0 ? (r.serie[r.serie.length - 1] / r.serie[0] - 1) * 100 : 0;
        String etq = (r.rango.isEmpty() ? "1 mes" : r.rango) + " " + Datos.pct(rangoPct);

        if (H < 110) {   // una fila: el número y hoy a la izquierda, la gráfica a la derecha si cabe
            float izq = W < 250 ? util : util * 0.55f;
            numero(r, ph, H / 2 + 3, izq, Math.min(32, H * 0.42f), 15);
            String t = ancho(diaTxt, 12, 600) <= izq ? diaTxt : Datos.pct(r.diaPct) + " hoy";
            texto(ph, H / 2 + 20, recortar(t, 12, 600, izq), 12, 600, color(r.dia), false);
            if (W >= 250) grafica(ph + izq + 14, pv + 6, W - ph, H - pv - 6, r.serie);
            return;
        }

        // cabecera: qué es, la hora de los precios y refrescar
        float y = pv + 11;
        texto(ph, y, "Patrimonio", 12, 600, APAGADO, false);
        refresco(W - ph - 6, y - 4.2f, 6.2f);
        texto(W - ph - 19, y, r.horaTxt, 11.5f, 500, APAGADO, true);

        // el número grande y lo de hoy (a la derecha si hay sitio, debajo si no)
        boolean lado = W >= 280;
        float maxSp = Math.max(26, Math.min(44, Math.min(H * 0.2f, W * 0.12f)));
        float yb = y + 10 + maxSp * 0.92f;
        float sp = numero(r, ph, yb, util * (lado ? 0.64f : 1f), maxSp, 18);
        if (lado) {
            texto(W - ph, yb - sp * 0.44f, r.oculto ? Datos.pct(r.diaPct) : Datos.eur(r.dia, true), 16, 650, color(r.dia), true);
            texto(W - ph, yb + 1, r.oculto ? "hoy" : Datos.pct(r.diaPct) + " hoy", 12, 600, color(r.dia), true);
            y = yb;
        } else {
            y = yb + 18;
            String t = ancho(diaTxt, 12.5f, 600) <= util ? diaTxt : Datos.pct(r.diaPct) + " hoy";
            texto(ph, y, recortar(t, 12.5f, 600, util), 12.5f, 600, color(r.dia), false);
        }

        // abajo, según el alto: lo que toca y lo que más ha movido hoy la cartera (en pastillas, como en la app)
        float abajo = H - pv, pie = 15;
        List<List<Pastilla>> filas = new ArrayList<>();
        if (H >= 280) filas = pastillas(r, util, H >= 330 ? 2 : 1);
        List<String> toca = new ArrayList<>();
        if (H >= 235 && !r.toca.isEmpty()) toca = lineas("Ahora: " + r.toca + (r.cuando.isEmpty() ? "" : ", " + r.cuando), 13, 500, util, 2);
        float altoToca = toca.isEmpty() ? 0 : 12 + 18 * toca.size();
        float altoFilas = filas.isEmpty() ? 0 : 30 + 31 * filas.size();
        float grafAbajo = abajo - pie - 6 - altoToca - altoFilas;
        grafica(ph, y + 12, W - ph, grafAbajo, r.serie);
        if (!hayGraf && grafAbajo - y - 12 >= 24) {   // aún sin datos del mes: una línea tenue y qué hacer
            float ym = (y + 12 + grafAbajo) / 2;
            p.reset();
            p.setAntiAlias(true);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1, dp(1)));
            p.setColor((APAGADO & 0x00FFFFFF) | 0x60000000);
            p.setPathEffect(new DashPathEffect(new float[]{dp(3), dp(3)}, 0));
            c.drawLine(dp(ph), dp(ym), dp(W - ph), dp(ym), p);
            p.setPathEffect(null);
            String aviso = recortar("La gráfica se carga al refrescar", 11.5f, 500, util - 24);
            float wa = ancho(aviso, 11.5f, 500);
            p.reset();
            p.setColor(PLANO);
            c.drawRect(dp(W / 2 - wa / 2 - 8), dp(ym - 9), dp(W / 2 + wa / 2 + 8), dp(ym + 9), p);
            texto(W / 2 - wa / 2, ym + 4, aviso, 11.5f, 500, APAGADO, false);
        }

        // lo ganado en total y lo que ha hecho la cartera en el periodo de la gráfica
        float yp = grafAbajo + 18;
        float wE = hayGraf ? ancho(etq, 11.5f, 650) : 0;
        String tot = (r.oculto ? Datos.pct(r.plPct) : Datos.eur(r.pl, true) + " (" + Datos.pct(r.plPct) + ")") + " en total";
        if (ancho(tot, 11.5f, 500) > util - wE - 10) tot = Datos.pct(r.plPct) + " en total";
        if (ancho(tot, 11.5f, 500) > util - wE - 10) tot = Datos.pct(r.plPct);
        if (ancho(tot, 11.5f, 500) <= util - wE - 10) texto(ph, yp, tot, 11.5f, 500, APAGADO, false);
        if (hayGraf) texto(W - ph, yp, etq, 11.5f, 650, colorPct(rangoPct), true);

        float yy = yp + 4;
        if (!toca.isEmpty()) {
            yy += 18;
            for (int k = 0; k < toca.size(); k++) {
                String l = toca.get(k);
                if (k == 0 && l.startsWith("Ahora:")) {
                    texto(ph, yy, "Ahora:", 13, 700, ACENTO, false);
                    texto(ph + ancho("Ahora: ", 13, 700), yy, l.substring(Math.min(l.length(), 7)), 13, 500, TEXTO2, false);
                } else texto(ph, yy, l, 13, 500, TEXTO2, false);
                yy += 18;
            }
            yy -= 18;
        }
        if (!filas.isEmpty()) {
            yy += 12;
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
        }
    }

    // ---------- lo que más ha movido hoy: pastillas de color ----------
    private static final float ALTO_P = 25;

    private static final class Pastilla {
        String nombre, eur, pct;
        int color;
        boolean sube;
        float w;
    }

    private float anchoPastilla(Pastilla t) {
        return 9 + 7 + 5 + ancho(t.nombre, 12.5f, 650) + (t.eur.isEmpty() ? 0 : 5 + ancho(t.eur, 12.5f, 650)) + 5 + ancho(t.pct, 11, 550) + 10;
    }

    /** las tres posiciones que más han movido hoy la cartera (como mínimo 1 €), repartidas en líneas que quepan */
    private List<List<Pastilla>> pastillas(Datos.Resultado r, float util, int maxLineas) {
        List<List<Pastilla>> out = new ArrayList<>();
        List<Pastilla> cur = new ArrayList<>();
        float usado = 0;
        int n = 0;
        for (Datos.Mov m : r.movs) {
            if (n == 3 || Math.abs(m.dia) < 1) break;   // van ordenadas de más a menos
            Pastilla t = new Pastilla();
            double pc = m.valor - m.dia != 0 ? m.dia / (m.valor - m.dia) * 100 : 0;
            t.sube = m.dia > 0;
            t.color = t.sube ? SUBE : BAJA;
            t.eur = r.oculto ? "" : Datos.eur(m.dia, true);
            t.pct = Datos.pct1(pc);
            t.nombre = m.nombre;
            t.w = anchoPastilla(t);
            if (t.w > util) {   // un nombre muy largo se recorta para que la pastilla quepa en la línea
                float sobra = t.w - util;
                t.nombre = recortar(t.nombre, 12.5f, 650, Math.max(24, ancho(t.nombre, 12.5f, 650) - sobra));
                t.w = anchoPastilla(t);
            }
            if (!cur.isEmpty() && usado + 6 + t.w > util) {
                out.add(cur);
                if (out.size() == maxLineas) return out;
                cur = new ArrayList<>();
                usado = 0;
            }
            usado += (cur.isEmpty() ? 0 : 6) + t.w;
            cur.add(t);
            n++;
        }
        if (!cur.isEmpty() && out.size() < maxLineas) out.add(cur);
        return out;
    }

    private void pastilla(Pastilla t, float x, float yTop) {
        p.reset();
        p.setAntiAlias(true);
        p.setStyle(Paint.Style.FILL);
        p.setColor((t.color & 0x00FFFFFF) | 0x24000000);
        c.drawRoundRect(new RectF(dp(x), dp(yTop), dp(x + t.w), dp(yTop + ALTO_P)), dp(ALTO_P / 2), dp(ALTO_P / 2), p);
        // el triángulo dibujado (Manrope no trae ▲ ni ▼)
        float cx = x + 9 + 3.5f, cy = yTop + ALTO_P / 2;
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
        float base = yTop + 17, tx = x + 9 + 7 + 5;
        texto(tx, base, t.nombre, 12.5f, 650, TEXTO, false);
        tx += ancho(t.nombre, 12.5f, 650) + 5;
        if (!t.eur.isEmpty()) {
            texto(tx, base, t.eur, 12.5f, 650, t.color, false);
            tx += ancho(t.eur, 12.5f, 650) + 5;
        }
        texto(tx, base, t.pct, 11, 550, (t.color & 0x00FFFFFF) | 0xD9000000, false);
    }
}
