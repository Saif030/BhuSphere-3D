"""Synthetic demo data generator — fictional names only. No real personal data."""
import random, uuid
from datetime import datetime
from .models import (Parcel, Building, Floor, Unit, Owner, Right, Utility,
                     DataSource, PropertySource, ValidationIssue, PropertyHistory)
from .ulpin import floor_label

random.seed(2026)
FIRST = ["Aarav","Diya","Kabir","Meera","Rohan","Ananya","Vikram","Priya","Arjun","Neha",
         "Ishaan","Kavya","Aditya","Shreya","Nikhil","Pooja","Rahul","Sneha","Varun","Anika"]
LAST = ["Sharma","Verma","Gupta","Mehta","Iyer","Reddy","Khan","Patel","Nair","Singh"]

LOCALITIES = [
    {"code": "SKT", "name": "Saket", "base": [77.2010, 28.5245]},
    {"code": "MLV", "name": "Malviya Nagar", "base": [77.2090, 28.5330]},
    {"code": "HZK", "name": "Hauz Khas", "base": [77.1930, 28.5490]},
]

def ring(cx, cy, w, h):
    return [[cx-w/2, cy-h/2],[cx+w/2, cy-h/2],[cx+w/2, cy+h/2],[cx-w/2, cy+h/2],[cx-w/2, cy-h/2]]

def seed(db):
    if db.query(Parcel).count() > 0:
        return {"seeded": False}
    # ---- sources ----
    src_defs = [
        ("GIS", "Municipal GIS Parcel Layer", "2026-04-14", "10 cm", "MCD Survey"),
        ("LiDAR", "LiDAR City Scan 2026", "2026-03-02", "8 pts/m²", "Survey Wing"),
        ("DRONE", "Drone Orthomosaic Saket", "2026-04-20", "5 cm", "Drone Cell"),
        ("GNSS", "CORS/GNSS Control", "2026-02-11", "2 cm", "SoI CORS"),
        ("FLOOR_PLAN", "Approved Floor Plans", "2025-11-30", "Architectural", "MCD Approvals"),
        ("DEM", "DEM/DSM 2026", "2026-03-02", "1 m", "Survey Wing"),
        ("REGISTRY", "Registry Metadata", "2026-01-15", "Record", "Sub-Registrar"),
    ]
    sources = []
    for t, n, d, r, p in src_defs:
        s = DataSource(source_type=t, name=n, capture_date=d, resolution=r, provider=p)
        db.add(s); sources.append(s)
    db.flush()

    owners = []
    for i in range(60):
        o = Owner(owner_reference=f"OWN-{i+1:04d}",
                  display_name=f"{random.choice(FIRST)} {random.choice(LAST)} (Demo)",
                  ownership_type=random.choice(["Freehold","Freehold","Leasehold"]),
                  verification_status=random.choice(["Verified","Verified","Verified","Pending"]))
        db.add(o); owners.append(o)
    db.flush()

    # ---- parcels & buildings ----
    # Flagship: Green Residency DL-SKT-0182 with B01(12fl,148u) B02(10fl,120u) B03(15fl,180u)
    flagship = {"parcel": "0182", "loc": LOCALITIES[0], "name": "Green Residency",
                "cx": 77.2010, "cy": 28.5245, "w": 0.0042, "h": 0.0032,
                "buildings": [("B01","Building A",12,148),("B02","Building B",10,120),("B03","Building C",15,180)]}
    parcels_spec = [flagship]
    # add ~14 more parcels across localities
    n = 183
    for li, loc in enumerate(LOCALITIES):
        for k in range(5 if li else 4):
            if li == 0 and k < 1: continue  # flagship occupies one slot visually
            parcels_spec.append({
                "parcel": f"{n:04d}", "loc": loc, "name": f"{loc['name']} Block-{k+1}",
                "cx": loc["base"][0] + random.uniform(-0.008, 0.008),
                "cy": loc["base"][1] + random.uniform(-0.006, 0.006),
                "w": random.uniform(0.0018, 0.0032), "h": random.uniform(0.0014, 0.0026),
                "buildings": [(f"B{i+1:02d}", f"Tower {chr(65+i)}", random.randint(5,14), random.randint(40,120))
                              for i in range(random.randint(1,3))]}); n += 1

    all_units, all_floors, all_buildings = [], [], []
    for ps in parcels_spec:
        loc = ps["loc"]
        parcel_id = f"DL-{loc['code']}-{ps['parcel']}"
        cx, cy = ps["cx"], ps["cy"]
        conf = round(random.uniform(88, 99), 1)
        p = Parcel(parcel_id=parcel_id, prototype_ulpin=parcel_id, survey_number=f"SY-{ps['parcel']}",
                   locality=loc["name"], land_use=random.choice(["Residential","Residential","Mixed","Commercial"]),
                   area_sqft=round(ps["w"]*ps["h"]*1.2e10/10.76, 0),
                   geometry=ring(cx, cy, ps["w"], ps["h"]), center=[cx, cy],
                   verification_status="Verified" if conf >= 95 else ("Needs Review" if conf < 80 else "High Confidence"),
                   confidence=conf)
        db.add(p); db.flush()
        db.add(PropertyHistory(entity_id=parcel_id, event_type="Parcel registered",
                               description=f"{ps['name']} parcel registered via municipal GIS.",
                               timestamp="2024-02-10", source_id=sources[0].id))
        # buildings inside parcel
        bx_list = [cx - ps["w"]/4, cx + ps["w"]/4] if len(ps["buildings"]) > 1 else [cx]
        for bi, (bcode, bname, nfloors, nunits) in enumerate(ps["buildings"]):
            bx = (bx_list[bi % len(bx_list)]) + random.uniform(-0.0002, 0.0002)
            by = cy + random.uniform(-0.0003, 0.0003)
            bw, bh = ps["w"]/ (len(ps["buildings"])+1.2), ps["h"]/2.4
            reg_h = round(nfloors*3.0 + random.uniform(-0.5, 0.5), 1)
            # inject mismatch on some buildings (B03 flagship + a few)
            mismatch = (ps["parcel"] == "0182" and bcode == "B03") or (random.random() < 0.18)
            lidar_h = round(reg_h + (3.4 if ps["parcel"]=="0182" and bcode=="B03" else random.uniform(2.1,3.8)*(1 if random.random()<.5 else -1)), 1) if mismatch else round(reg_h + random.uniform(-0.4,0.4),1)
            bconf = round(random.uniform(82, 98), 1)
            if mismatch: bconf = round(min(bconf, 88.5), 1)
            b = Building(building_id=bcode, parcel_id=parcel_id, name=f"{ps['name']} – {bname}",
                         geometry=ring(bx, by, bw, bh), center=[bx, by],
                         height_m=lidar_h, registered_height_m=reg_h, lidar_height_m=lidar_h,
                         num_floors=nfloors, construction_year=random.randint(2015,2024),
                         verification_status="Verified" if bconf>=95 else ("Needs Review" if bconf<80 or mismatch else "High Confidence"),
                         confidence=bconf)
            db.add(b); db.flush(); all_buildings.append(b)
            db.add(PropertyHistory(entity_id=f"{parcel_id}-{bcode}", event_type="Building registered",
                                   description=f"{bname} registered with {nfloors} floors.", timestamp="2024-06-15"))
            # floors: -2..nfloors (B2,B1,G,F1..)
            floor_nums = [-2, -1, 0] + list(range(1, nfloors+1))
            per_floor = max(1, nunits // nfloors)
            for fn in floor_nums:
                fl = floor_label(fn)
                if fn <= 0: zmin, zmax = (fn-1)*3.0, fn*3.0  # basements negative
                else: zmin, zmax = (fn-1)*3.0, fn*3.0
                fconf = round(random.uniform(85, 99), 1)
                f = Floor(floor_id=f"{parcel_id}-{bcode}-{fl}", building_key=b.id,
                          floor_number=fn, floor_label=fl, z_min=zmin, z_max=zmax,
                          geometry=ring(bx, by, bw, bh),
                          usage="Parking" if fn < 0 else ("Lobby" if fn == 0 else "Residential"),
                          verification_status="Verified" if fconf >= 95 else "High Confidence", confidence=fconf)
                db.add(f); db.flush(); all_floors.append(f)
                # units only on residential floors (skip basements/ground mostly)
                if fn >= 1:
                    for u in range(per_floor):
                        uno = f"{fn}{u+1:02d}"  # e.g. 804
                        ulpin = f"{parcel_id}-{bcode}-{fl}-U{uno}"
                        uconf = round(random.uniform(84, 99), 1)
                        owner = random.choice(owners)
                        missing_owner = random.random() < 0.05
                        un = Unit(unit_id=ulpin, prototype_ulpin=ulpin, floor_key=f.id,
                                  unit_number=uno, geometry=ring(bx, by, bw/3, bh/3),
                                  area_sqft=random.choice([945, 1100, 1245, 1380, 1560]),
                                  verification_status="Unverified" if missing_owner else ("Verified" if uconf>=95 else "High Confidence"),
                                  confidence=round(uconf-12,1) if missing_owner else uconf,
                                  owner_id=None if missing_owner else owner.id)
                        db.add(un); all_units.append(un)
                        if not missing_owner:
                            db.add(Right(spatial_unit_id=ulpin, owner_id=owner.id, right_type="Ownership"))
                        for s in random.sample(sources, k=random.randint(4,7)):
                            db.add(PropertySource(entity_ulpin=ulpin, source_id=s.id, score=round(random.uniform(90,99),1)))
            db.add(PropertyHistory(entity_id=f"{parcel_id}-{bcode}", event_type="LiDAR survey",
                                   description=f"LiDAR-derived height {lidar_h}m vs registered {reg_h}m.",
                                   timestamp="2026-03-02", source_id=sources[1].id))

    # force flagship A804 confidence 96.4 & area 1245 for demo script
    flag = db.query(Unit).filter(Unit.prototype_ulpin == "DL-SKT-0182-B01-F08-U804").first()
    # flagship per-floor counts may not yield exact F08-U804; create/adjust it
    if not flag:
        f8 = db.query(Floor).filter(Floor.floor_id == "DL-SKT-0182-B01-F08").first()
        if f8:
            o = owners[0]
            flag = Unit(unit_id="DL-SKT-0182-B01-F08-U804", prototype_ulpin="DL-SKT-0182-B01-F08-U804",
                        floor_key=f8.id, unit_number="804", geometry=f8.geometry,
                        area_sqft=1245, owner_id=o.id, verification_status="Verified", confidence=96.4)
            db.add(flag); db.add(Right(spatial_unit_id=flag.prototype_ulpin, owner_id=o.id))
    else:
        flag.area_sqft = 1245; flag.confidence = 96.4; flag.verification_status = "Verified"
        if flag.owner_id is None:
            flag.owner_id = owners[0].id
            db.add(Right(spatial_unit_id=flag.prototype_ulpin, owner_id=owners[0].id))
    db.flush()

    # ---- utilities ----
    udefs = [
        ("WTR-00182", "Water", -4.5, "Municipal Water Authority", 2018),
        ("ELEC-00921", "Electrical", -2.8, "Utility Department", 2020),
        ("TEL-00382", "Telecom", -2.2, "Telecom Dept", 2021),
        ("SWR-00214", "Sewer", -5.2, "Municipal Water Authority", 2017),
        ("GAS-00107", "Gas", -3.4, "City Gas Ltd", 2022),
        ("MET-00077", "Transport", -12.0, "Metro Authority", 2023),
    ]
    cx0, cy0 = 77.2010, 28.5245
    for uid_, ut, depth, agency, yr in udefs:
        line = [[cx0-0.006+i*0.002, cy0-0.002+ (0.001 if ut in ("Water","Sewer") else -0.001)*i] for i in range(7)]
        db.add(Utility(utility_id=uid_, utility_type=ut, geometry=line, depth_m=depth,
                       owner_agency=agency, installation_year=yr, status="Active",
                       affected_parcels=["DL-SKT-0182", "DL-SKT-0183"]))
    # a few more random utilities
    for i in range(8):
        loc = random.choice(LOCALITIES)
        ut = random.choice(["Water","Electrical","Sewer","Telecom","Gas"])
        cx, cy = loc["base"][0]+random.uniform(-.006,.006), loc["base"][1]+random.uniform(-.005,.005)
        db.add(Utility(utility_id=f"{ut[:3].upper()}-{random.randint(10000,99999)}", utility_type=ut,
                       geometry=[[cx+j*0.0015, cy] for j in range(5)], depth_m=round(random.uniform(-6,-2),1),
                       owner_agency="City Utility", installation_year=random.randint(2016,2024),
                       affected_parcels=[]))
    # history for flagship
    for e, d, t in [("DL-SKT-0182-B01-F08-U804","Ownership verified by sub-registrar.","2026-04-04"),
                    ("DL-SKT-0182-B01-F08-U804","AI validation performed — score 96.4%.","2026-04-20"),
                    ("DL-SKT-0182-B03","Floor plan updated — additional floor detected.","2025-08-19")]:
        db.add(PropertyHistory(entity_id=e, event_type="Update", description=d, timestamp=t))
    db.commit()

    # ---- validation issues via engine ----
    from .validation import run_all_checks
    run_all_checks(db)
    return {"seeded": True, "units": len(all_units)}
