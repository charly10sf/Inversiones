package es.inversiones.app;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;

/**
 * 0.8 (rediseño a Toisón): el diseño que se ha elegido en la web (Mármol o Marfil; vacío o desconocido = Mármol,
 * el de por defecto, que es también el de antes de que la web lo mande; «borgona», quitado el 7 nov, = Marfil)
 * y sus colores para lo que pinta la app por su cuenta: el widget, los avisos y las barras del móvil. La web lo manda
 * por el puente (Puente.tema) cada vez que abre y cuando cambia; aquí se guarda para que el widget y los avisos lo
 * sepan aunque la app esté cerrada. Los colores son los tokens de src/css/00-temas.css: si cambian allí, cambiarlos aquí.
 */
final class Tema {
    static final String[] TEMAS = {"marmol", "marfil"};

    final String id;          // "marmol" o "marfil"
    final boolean claro;      // fondo claro (Marfil): iconos oscuros en las barras del móvil
    /** el widget: fondo de arriba y de abajo, borde, textos, apagado (--muted), la curva y su brillo, el oro de los
     *  textos, sube y baja */
    final int fondoA, fondoB, linea, texto, texto2, apagado, acento, acentoLuz, oroTexto, sube, baja;
    /** el color de los avisos (el icono pequeño y el nombre de la app) y el de las barras del móvil */
    final int aviso, barra;

    private Tema(String id, boolean claro, int fondoA, int fondoB, int linea, int texto, int texto2, int apagado,
                 int acento, int acentoLuz, int oroTexto, int sube, int baja, int aviso, int barra) {
        this.id = id;
        this.claro = claro;
        this.fondoA = fondoA;
        this.fondoB = fondoB;
        this.linea = linea;
        this.texto = texto;
        this.texto2 = texto2;
        this.apagado = apagado;
        this.acento = acento;
        this.acentoLuz = acentoLuz;
        this.oroTexto = oroTexto;
        this.sube = sube;
        this.baja = baja;
        this.aviso = aviso;
        this.barra = barra;
    }

    // Mármol G (0.8.2c, 6 nov): negro AMOLED. Superficie #111111 → fondo #000000, borde #313131, textos #f8f6f2 y #d2cdc5,
    // apagado = texto 2 al 78 % sobre el negro (#a4a09a), el oro del logo y sube/baja de la web; barras en negro puro
    private static final Tema MARMOL = new Tema("marmol", false, 0xFF111111, 0xFF000000, 0xFF313131, 0xFFF8F6F2,
            0xFFD2CDC5, 0xFFA4A09A, 0xFFE3B45F, 0xFFF7DFA8, 0xFFE3B45F, 0xFF55E8A0, 0xFFFF6B62, 0xFFE3B45F, 0xFF000000);
    // Marfil (0.8.3b, 7 nov): la tarjeta casi blanca #fdf9f2 → la crema honda #e5d7bf, borde #dccbb0, tinta #1c1915 y
    // #4a443d, apagado = texto 2 al 92 % sobre el fondo #ede1cc (#575148), la curva en el oro de la gráfica (#a87a2a), los
    // textos de oro en #7a5716 (5:1 sobre la crema), el aviso en el vino del primario y las barras de la crema del fondo
    private static final Tema MARFIL = new Tema("marfil", true, 0xFFFDF9F2, 0xFFE5D7BF, 0xFFDCCBB0, 0xFF1C1915,
            0xFF4A443D, 0xFF575148, 0xFFA87A2A, 0xFF7A5716, 0xFF7A5716, 0xFF08573A, 0xFFA42018, 0xFF4E101D, 0xFFEDE1CC);

    static String limpio(String t) {
        if ("borgona".equals(t)) return "marfil"; // Borgoña se quitó el 7 nov: quien lo tenía, a Marfil
        if (t != null) for (String x : TEMAS) if (x.equals(t)) return x;
        return "marmol";
    }

    static Tema de(String t) {
        switch (limpio(t)) {
            case "marfil": return MARFIL;
            default: return MARMOL;
        }
    }

    static Tema de(Context c) {
        return de(Datos.prefs(c).getString("tema", ""));
    }

    /** guarda el diseño que manda la web; true si ha cambiado (entonces hay que repintar el widget) */
    static boolean guardar(Context c, String t) {
        String nuevo = limpio(t);
        if (nuevo.equals(limpio(Datos.prefs(c).getString("tema", "")))) return false;
        Datos.prefs(c).edit().putString("tema", nuevo).apply();
        return true;
    }

    /** el icono pequeño de los avisos: el símbolo de Toisón a una tinta */
    int icono() {
        return R.drawable.ic_aviso_ts;
    }

    /** cómo se llama la IA en los avisos: en español, «la IA» (como en la web: NOM_TS en 10-pintado.js); en inglés, de
     *  momento, GrowIA */
    String ia(boolean en, boolean mayuscula) {
        if (en) return "GrowIA";
        return mayuscula ? "La IA" : "la IA";
    }

    /** la barra de arriba y la de abajo del móvil, del color del fondo de la web; con Marfil, iconos oscuros */
    @SuppressWarnings("deprecation")
    void pintarBarras(Activity a) {
        Window w = a.getWindow();
        w.setStatusBarColor(barra);
        w.setNavigationBarColor(barra);
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController ic = w.getInsetsController();
            if (ic != null) {
                int ambas = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                ic.setSystemBarsAppearance(claro ? ambas : 0, ambas);
            }
        } else {
            View d = w.getDecorView();
            int f = d.getSystemUiVisibility() & ~(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
            if (claro) f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            d.setSystemUiVisibility(f);
        }
    }

    /** el fondo de la vista de la web mientras carga (así no hay un fogonazo negro con Marfil) */
    int fondoWeb() {
        return barra;
    }
}
