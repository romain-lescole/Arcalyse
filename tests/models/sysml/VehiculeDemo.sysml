package VehiculeDemo {
    private import ISQ::*;
    private import SI::*;

    doc /* Modèle de démonstration Arcature v2. */

    // ---------- Structure ----------
    part def Vehicule {
        attribute masse :> ISQ::mass;
        part boite : Boite;
        part moteurs : Moteur[2];
        interface : Transmission connect moteurs.arbre to boite.entree;
    }
    part def Boite {
        port entree : ~ArbrePort;
        part pignons : Pignon[4];
    }
    part def Pignon;
    part def Moteur {
        port arbre : ArbrePort;
    }
    part def MoteurHybride :> Moteur;

    port def ArbrePort {
        out attribute couple :> ISQ::torque;
    }
    interface def Transmission {
        end source : ArbrePort;
        end cible : ~ArbrePort;
    }

    // ---------- Comportement ----------
    action def Demarrage {
        first start;
        then action allumer;
        then action stabiliser;
        then done;
    }
    state def EtatsMoteur {
        entry; then arret;
        state arret;
        state marche;
        transition arret_marche first arret accept OrdreDemarrage then marche;
        transition marche_arret first marche accept OrdreArret then arret;
    }
    item def OrdreDemarrage;
    item def OrdreArret;

    // ---------- Exigences ----------
    requirement def <'R-001'> MasseMax {
        doc /* La masse totale ne dépasse pas la limite. */
        subject v : Vehicule;
        attribute limite :> ISQ::mass;
        require constraint { v.masse <= limite }
    }

    // ---------- Instance système ----------
    part vehicule : Vehicule {
        attribute :>> masse = 1800 [kg];
        perform action demarrage : Demarrage;
        exhibit state etats : EtatsMoteur;
    }
    requirement masseVehicule : MasseMax {
        attribute :>> limite = 2000 [kg];
    }
    satisfy masseVehicule by vehicule;
}
