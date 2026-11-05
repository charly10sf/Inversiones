package es.inversiones.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;

/** El resultado de una actualización sola (Actualizador.instalarSolo). Si Android pide que la confirmes, no se insiste:
 *  se apunta que en este móvil no se puede y vuelve el aviso de «Hay una versión nueva de la app» de siempre. */
public class Instalado extends BroadcastReceiver {
    static final String ACCION = "es.inversiones.app.INSTALADO";

    @Override
    public void onReceive(Context c, Intent i) {
        int st = i.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (st == PackageInstaller.STATUS_SUCCESS) return;
        Datos.prefs(c).edit()
                .putBoolean("auto_no", st == PackageInstaller.STATUS_PENDING_USER_ACTION)
                .putInt("auto_intento", 0)
                .putInt("app_avisada", 0)
                .apply();
    }
}
