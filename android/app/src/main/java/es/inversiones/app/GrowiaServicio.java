package es.inversiones.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

/** 0.7f: mientras GrowIA contesta, la app sigue viva en segundo plano: un servicio en primer plano con una notificación
 *  discreta. Sin él, Android congela la app al poco de salir de ella y se corta la conexión con Google (lo vio Carlos el
 *  30 oct: «tres veces seguidas (Failed to fetch)»). Al acabar, si no estás mirando la app, avisa de que ya ha contestado.
 *
 *  0.7l: siempre dataSync. En la 0.7f, con Android 14 o más, era shortService, y Android lo para a los 3 minutos: una
 *  respuesta con reintentos pasa de ahí, se quitaba la notificación y se cortaba la conexión (lo vio Carlos el 30 oct).
 *  Mientras trabaja, además, un wakelock parcial (con su tope) para que el móvil no se duerma con la pantalla apagada.
 *  Todo se hace en el hilo principal, así empezar y terminar no se cruzan con onStartCommand.
 *  Para la Play Store, dataSync pide declararlo en la consola (con un vídeo de GrowIA contestando con la app fuera). */
public class GrowiaServicio extends Service {
    private static final String CANAL = "growia";
    private static final String CANAL_FIN = "growia-fin";
    private static final int ID = 7701, ID_FIN = 7702;
    /** por si la web no llega a decir que ha acabado: la web se rinde antes (unos 2 minutos sin conexión con la app fuera) */
    private static final long TOPE_MS = 10 * 60_000L;
    private static final Handler HILO = new Handler(Looper.getMainLooper());

    /** pedido arrancar y aún sin startForeground: si llega «terminar» antes, se para en cuanto arranca (pararlo antes de
     *  startForeground hace que Android cierre la app) */
    private static boolean arrancando, enMarcha, pararAlArrancar;
    private PowerManager.WakeLock despierto;
    private final Runnable tope = () -> {
        Diario.apunta("Servicio: tope de 10 minutos, lo paro");
        stopSelf();
    };

    static boolean vivo() {
        return enMarcha || arrancando;
    }

    static void empezar(Context c, String texto) {
        HILO.post(() -> {
            quitarAviso(c);
            pararAlArrancar = false;
            Intent i = new Intent(c, GrowiaServicio.class).putExtra("texto", texto);
            try {
                c.startForegroundService(i);
                if (!enMarcha) arrancando = true;
            } catch (Exception e) {
                // con la app ya en segundo plano, Android 12 o más no deja empezarlo: GrowIA sigue sin él
                arrancando = false;
                Diario.apunta("Servicio: Android no deja arrancarlo (" + e.getClass().getSimpleName() + ")");
            }
        });
    }

    static void terminar(Context c, String titulo, String texto) {
        HILO.post(() -> {
            if (enMarcha) c.stopService(new Intent(c, GrowiaServicio.class));
            else if (arrancando) pararAlArrancar = true;
            if (titulo != null && !titulo.isEmpty() && !Principal.enPantalla) avisar(c, titulo, texto);
        });
    }

    /** ya estás en la app: el aviso de que ha contestado sobra */
    static void quitarAviso(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(ID_FIN);
    }

    private static boolean en(Context c) {
        return Datos.en(c);
    }

    private static PendingIntent abrir(Context c, int codigo) {
        Intent i = new Intent(c, Principal.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, codigo, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void canales(Context c, NotificationManager nm) {
        boolean en = en(c);
        if (nm.getNotificationChannel(CANAL) == null) {
            NotificationChannel ch = new NotificationChannel(CANAL, en ? "GrowIA at work" : "GrowIA trabajando", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription(en ? "While GrowIA answers, so it isn't cut off when you leave the app" : "Mientras GrowIA contesta, para que no se corte al salir de la app");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        if (nm.getNotificationChannel(CANAL_FIN) == null) {
            NotificationChannel ch = new NotificationChannel(CANAL_FIN, en ? "GrowIA's answers" : "Respuestas de GrowIA", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription(en ? "When GrowIA finishes and you're not in the app" : "Cuando GrowIA acaba y no estás en la app");
            nm.createNotificationChannel(ch);
        }
    }

    /** el aviso de que ha acabado: sin nada de la respuesta (se ve en la pantalla de bloqueo) */
    private static void avisar(Context c, String titulo, String texto) {
        if (!Avisos.permitidos(c)) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        canales(c, nm);
        Notification n = new Notification.Builder(c, CANAL_FIN)
                .setSmallIcon(R.drawable.ic_aviso)
                .setColor(0xFFEDBB45)
                .setContentTitle(titulo)
                .setContentText(texto == null ? "" : texto)
                .setContentIntent(abrir(c, ID_FIN))
                .setAutoCancel(true)
                .build();
        nm.notify(ID_FIN, n);
    }

    @Override
    public int onStartCommand(Intent i, int flags, int id) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) canales(this, nm);
        String texto = i != null ? i.getStringExtra("texto") : null;
        if (texto == null || texto.isEmpty()) texto = en(this) ? "GrowIA is answering…" : "GrowIA está contestando…";
        Notification n = new Notification.Builder(this, CANAL)
                .setSmallIcon(R.drawable.ic_aviso)
                .setColor(0xFFEDBB45)
                .setContentTitle(texto)
                .setContentIntent(abrir(this, ID))
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setProgress(0, 0, true)
                .build();
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            else startForeground(ID, n);
        } catch (Exception e) {
            arrancando = false;
            Diario.apunta("Servicio: no arranca (" + e.getClass().getSimpleName() + ")");
            stopSelf();
            return START_NOT_STICKY;
        }
        boolean yaEstaba = enMarcha;
        enMarcha = true;
        arrancando = false;
        if (despierto == null) {
            PowerManager pm = getSystemService(PowerManager.class);
            if (pm != null) {
                despierto = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GrowFolio:growia");
                despierto.setReferenceCounted(false);
            }
        }
        if (despierto != null) despierto.acquire(TOPE_MS);
        HILO.removeCallbacks(tope);
        HILO.postDelayed(tope, TOPE_MS);
        if (!yaEstaba) Diario.apunta("Servicio en marcha" + (restringida(this) ? " (ojo: batería restringida)" : ""));
        if (pararAlArrancar) {
            pararAlArrancar = false;
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    /** Android tiene la app con la batería restringida (en Samsung, «Restringido» o «En suspensión profunda»): así el
     *  servicio no la protege al salir y se corta la conexión */
    static boolean restringida(Context c) {
        if (Build.VERSION.SDK_INT < 28) return false;
        android.app.ActivityManager am = c.getSystemService(android.app.ActivityManager.class);
        return am != null && am.isBackgroundRestricted();
    }

    /** si algún día pasa a targetSdk 35: dataSync tiene un tope de 6 horas al día. Hay que pararlo ya o Android cierra la app */
    @Override
    public void onTimeout(int startId) {
        Diario.apunta("Servicio: Android ha pedido pararlo (tiempo)");
        stopSelf();
    }

    @Override
    public void onTimeout(int startId, int tipo) {
        Diario.apunta("Servicio: Android ha pedido pararlo (tiempo)");
        stopSelf();
    }

    @Override
    public void onDestroy() {
        HILO.removeCallbacks(tope);
        if (despierto != null && despierto.isHeld()) despierto.release();
        if (enMarcha) Diario.apunta("Servicio parado");
        enMarcha = false;
        arrancando = false;
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent i) {
        return null;
    }
}
