package es.inversiones.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

/** Le deja al instalador de Android leer el APK descargado con un permiso temporal y, desde la 0.7n, a la app con la que
 *  compartes leer la imagen que has hecho en GrowFolio («Mi cartera en GTA VI»). Nada más. */
public class Archivos extends ContentProvider {
    static final String AUTORIDAD = BuildConfig.APPLICATION_ID + ".archivos";
    private static final String TIPO = "application/vnd.android.package-archive";
    static final String IMAGEN = "compartir.png";

    static Uri uri() {
        return Uri.parse("content://" + AUTORIDAD + "/" + Actualizador.NOMBRE);
    }

    static Uri uriImagen() {
        return Uri.parse("content://" + AUTORIDAD + "/" + IMAGEN);
    }

    /** la imagen para compartir: una sola, en la caché, que se pisa cada vez */
    static File imagen(android.content.Context c) {
        File d = new File(c.getCacheDir(), "compartir");
        if (!d.exists()) d.mkdirs();
        return new File(d, IMAGEN);
    }

    private File archivo(Uri u) {
        if (u == null || getContext() == null) return null;
        String n = u.getLastPathSegment();
        File f = BuildConfig.ACTUALIZA_SOLA && Actualizador.NOMBRE.equals(n) ? Actualizador.archivo(getContext()) : IMAGEN.equals(n) ? imagen(getContext()) : null;
        return f != null && f.exists() ? f : null;
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri u, String modo) throws FileNotFoundException {
        File f = archivo(u);
        if (f == null) throw new FileNotFoundException();
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public String getType(Uri u) {
        // 0.8.3: el tipo de APK solo para el APK (en la de Google Play nunca hay ninguno que servir)
        String n = u == null ? null : u.getLastPathSegment();
        return IMAGEN.equals(n) ? "image/png" : BuildConfig.ACTUALIZA_SOLA && Actualizador.NOMBRE.equals(n) ? TIPO : null;
    }

    @Override
    public Cursor query(Uri u, String[] columnas, String sel, String[] args, String orden) {
        File f = archivo(u);
        if (f == null) return null;
        MatrixCursor c = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
        c.addRow(new Object[]{f.getName(), f.length()});
        return c;
    }

    @Override
    public Uri insert(Uri u, ContentValues v) {
        return null;
    }

    @Override
    public int delete(Uri u, String sel, String[] args) {
        return 0;
    }

    @Override
    public int update(Uri u, ContentValues v, String sel, String[] args) {
        return 0;
    }
}
