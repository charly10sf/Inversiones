"""Cuándo hace falta volver a pedir a Yahoo el precio de algo (16 nov 2026).

Con la bolsa cerrada, el último cierre ya no cambia: si se pidió después del cierre (con margen), volver a pedirlo da lo
mismo. Aquí está el horario de cada bolsa (por el sufijo del símbolo de Yahoo, o por el símbolo en los índices) y quieto(),
que dice si un precio pedido a cierta hora sigue valiendo ahora.

Va siempre del lado de pedir: lo que no está en la tabla se pide siempre; los festivos cuentan como días de bolsa (se pide
como hoy); la ventana empieza 15 minutos antes de abrir y acaba 75 después de cerrar (subastas de cierre, retrasos de
Yahoo y correcciones del último precio).
"""
import datetime as dt
from zoneinfo import ZoneInfo

ANTES = dt.timedelta(minutes=15)
DESPUES = dt.timedelta(minutes=75)

# sufijo de Yahoo -> (zona horaria, apertura, cierre), de lunes a viernes. "" son las de EEUU (sin sufijo).
BOLSAS = {
    "": ("America/New_York", "09:30", "16:00"),
    "MC": ("Europe/Madrid", "09:00", "17:30"),
    "DE": ("Europe/Berlin", "09:00", "17:30"),
    "L": ("Europe/London", "08:00", "16:30"),
    "IL": ("Europe/London", "08:00", "16:30"),
    "PA": ("Europe/Paris", "09:00", "17:30"),
    "AS": ("Europe/Amsterdam", "09:00", "17:30"),
    "BR": ("Europe/Brussels", "09:00", "17:30"),
    "LS": ("Europe/Lisbon", "08:00", "16:30"),
    "MI": ("Europe/Rome", "09:00", "17:30"),
    "SW": ("Europe/Zurich", "09:00", "17:30"),
    "ST": ("Europe/Stockholm", "09:00", "17:30"),
    "CO": ("Europe/Copenhagen", "09:00", "17:00"),
    "HE": ("Europe/Helsinki", "10:00", "18:30"),
    "OL": ("Europe/Oslo", "09:00", "16:20"),
    "VI": ("Europe/Vienna", "09:00", "17:35"),
    "IR": ("Europe/Dublin", "08:00", "16:30"),
}

# Índices (por su símbolo). Fuera de la tabla, y a propósito: los que cotizan casi todo el día (divisas, futuros, bonos,
# VIX, cripto) y las bolsas que abren en domingo o han cambiado de días hace poco (Golfo, Egipto, Israel, Dubái).
INDICES = {
    "^IBEX": ("Europe/Madrid", "09:00", "17:30"),
    "^STOXX50E": ("Europe/Berlin", "09:00", "18:00"),
    "^GDAXI": ("Europe/Berlin", "09:00", "17:35"),
    "^FCHI": ("Europe/Paris", "09:00", "17:35"),
    "^FTSE": ("Europe/London", "08:00", "16:35"),
    "^GSPC": ("America/New_York", "09:30", "16:00"),
    "^NDX": ("America/New_York", "09:30", "16:00"),
    "^RUT": ("America/New_York", "09:30", "16:00"),
    "^N225": ("Asia/Tokyo", "09:00", "15:30"),
    "^HSI": ("Asia/Hong_Kong", "09:30", "16:10"),
    "000001.SS": ("Asia/Shanghai", "09:30", "15:00"),
    "^NSEI": ("Asia/Kolkata", "09:15", "15:30"),
    "^BVSP": ("America/Sao_Paulo", "10:00", "18:00"),
    "^SSMI": ("Europe/Zurich", "09:00", "17:35"),
    "^GSPTSE": ("America/Toronto", "09:30", "16:00"),
    "^AEX": ("Europe/Amsterdam", "09:00", "17:35"),
    "FTSEMIB.MI": ("Europe/Rome", "09:00", "17:35"),
    "^MXX": ("America/Mexico_City", "08:30", "15:00"),
    "^BFX": ("Europe/Brussels", "09:00", "17:35"),
    "PSI20.LS": ("Europe/Lisbon", "08:00", "16:35"),
    "^OMX": ("Europe/Stockholm", "09:00", "17:35"),
    "^ATX": ("Europe/Vienna", "09:00", "17:35"),
    "^OMXC25": ("Europe/Copenhagen", "09:00", "17:00"),
    "^ISEQ": ("Europe/Dublin", "08:00", "16:35"),
    "^OMXH25": ("Europe/Helsinki", "10:00", "18:30"),
    "^KS11": ("Asia/Seoul", "09:00", "15:30"),
    "GD.AT": ("Europe/Athens", "10:00", "17:20"),
    "OBX.OL": ("Europe/Oslo", "09:00", "16:25"),
    "^TWII": ("Asia/Taipei", "09:00", "13:30"),
    "^AXJO": ("Australia/Sydney", "10:00", "16:15"),
    "^NZ50": ("Pacific/Auckland", "10:00", "16:45"),
    "^STI": ("Asia/Singapore", "09:00", "17:15"),
    "^JKSE": ("Asia/Jakarta", "09:00", "16:15"),
    "^KLSE": ("Asia/Kuala_Lumpur", "09:00", "17:00"),
    "^J203.JO": ("Africa/Johannesburg", "09:00", "17:15"),
    "^SET.BK": ("Asia/Bangkok", "10:00", "16:40"),
    "PSEI.PS": ("Asia/Manila", "09:30", "16:00"),
    "WIG20.WA": ("Europe/Warsaw", "09:00", "17:05"),
}


def bolsa_de(sim):
    """(zona, apertura, cierre) de un símbolo, o None si no se sabe (entonces se pide siempre)."""
    s = str(sim or "").upper()
    if not s:
        return None
    if s in INDICES:
        return INDICES[s]
    if s.startswith("^") or "=" in s or s.endswith("-EUR") or s.endswith("-USD") or s.startswith("0P"):
        return None
    if "." in s:
        return BOLSAS.get(s.rsplit(".", 1)[1])
    return BOLSAS[""]


def _hora(dia, hhmm, zona):
    h, m = (int(x) for x in hhmm.split(":"))
    return dt.datetime(dia.year, dia.month, dia.day, h, m, tzinfo=zona)


def en_sesion(sim, ahora):
    """Si ahora está dentro de la ventana de su bolsa (de 15 min antes de abrir a 75 después de cerrar, de lunes a
    viernes). Sin horario conocido, siempre."""
    b = bolsa_de(sim)
    if not b:
        return True
    zona = ZoneInfo(b[0])
    loc = ahora.astimezone(zona)
    if loc.weekday() >= 5:
        return False
    return _hora(loc, b[1], zona) - ANTES <= loc <= _hora(loc, b[2], zona) + DESPUES


def fin_ultima_sesion(sim, ahora):
    """Cuándo acabó la ventana de la última sesión antes de ahora (UTC). None si no se sabe."""
    b = bolsa_de(sim)
    if not b:
        return None
    zona = ZoneInfo(b[0])
    loc = ahora.astimezone(zona)
    for atras in range(0, 8):
        dia = (loc - dt.timedelta(days=atras)).date()
        if dia.weekday() >= 5:
            continue
        fin = _hora(dia, b[2], zona) + DESPUES
        if fin <= loc:
            return fin.astimezone(dt.timezone.utc)
    return None


def quieto(sim, pedido, ahora):
    """True si el precio de sim pedido a la hora «pedido» (UTC) es el mismo que daría Yahoo ahora: su bolsa está fuera
    de la ventana y se pidió después de que acabara la ventana de la última sesión. Ante la duda, False (se pide)."""
    if not pedido or en_sesion(sim, ahora):
        return False
    fin = fin_ultima_sesion(sim, ahora)
    return fin is not None and pedido >= fin


def leer_hora(iso):
    try:
        t = dt.datetime.fromisoformat(str(iso))
        return t if t.tzinfo else t.replace(tzinfo=dt.timezone.utc)
    except (TypeError, ValueError):
        return None
