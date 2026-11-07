package es.inversiones.app;

import android.os.Process;
import android.os.SystemClock;

import org.json.JSONObject;

/** 0.8.3: cuándo pasa cada cosa al abrir la app (Carlos, 6 nov: cerrada del todo tardaba unos 10 s). La web lo junta con
 *  lo suyo y lo apunta en el registro de Ajustes de GrowIA. Solo horas: nada de la cartera. Todo en milisegundos de reloj
 *  (System.currentTimeMillis), como performance.timeOrigin en la web, para poder restarlos */
final class Arranque {
    private static long proceso, crear, cargar, empieza, termina;

    private Arranque() {}

    /** al empezar onCreate: la hora a la que arrancó el proceso (antes que la app, el sistema carga Java y la app) */
    static synchronized void crear() {
        long ahora = System.currentTimeMillis();
        if (proceso == 0) proceso = ahora - (SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime());
        crear = ahora;
        cargar = empieza = termina = 0;
    }

    static synchronized void cargar() { if (cargar == 0) cargar = System.currentTimeMillis(); }
    static synchronized void empieza() { if (empieza == 0) empieza = System.currentTimeMillis(); }
    static synchronized void termina() { if (termina == 0) termina = System.currentTimeMillis(); }

    static synchronized String json() {
        try {
            return new JSONObject().put("proceso", proceso).put("crear", crear).put("cargar", cargar)
                    .put("empieza", empieza).put("termina", termina).toString();
        } catch (Exception e) {
            return "{}";
        }
    }
}
