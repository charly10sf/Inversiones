package es.inversiones.app;

import org.json.JSONArray;
import org.json.JSONObject;

/** 0.7l: lo último que ha hecho la app mientras GrowIA trabaja (el servicio, la red, si sales o vuelves), para verlo
 *  en Ajustes de GrowIA junto a lo que apunta la web. Sin nada de la pregunta, de la respuesta ni de la cartera. Solo
 *  en memoria: se pierde al cerrar la app, que es justo cuando ya no hace falta. */
final class Diario {
    private static final int MAX = 60;
    private static final long[] T = new long[MAX];
    private static final String[] X = new String[MAX];
    private static int n, sig;

    private Diario() {}

    static synchronized void apunta(String texto) {
        T[sig] = System.currentTimeMillis();
        X[sig] = texto;
        sig = (sig + 1) % MAX;
        if (n < MAX) n++;
    }

    /** [{t, x}, …], del más viejo al más nuevo */
    static synchronized String json() {
        JSONArray a = new JSONArray();
        int desde = (sig - n + MAX) % MAX;
        for (int k = 0; k < n; k++) {
            int i = (desde + k) % MAX;
            try {
                a.put(new JSONObject().put("t", T[i]).put("x", X[i]));
            } catch (Exception e) {
                // no pasa
            }
        }
        return a.toString();
    }
}
