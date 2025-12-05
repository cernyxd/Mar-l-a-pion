# 🚩 Maršál a Špión

Digitální implementace deskové hry Maršál a Špión tak jak se to hrála za starých časů ve školní družině.
---

## 🛠️ Jak spustit lokálně

Pro spuštění hry stačí mít stažené všechny soubory (`index.html`, `script.js`, `style.css` a složku `assets` s obrázky).

1.  **Klonujte** repozitář:
    ```bash
    git clone [ADRESA_VAŠEHO_REPOZITÁŘE]
    ```
2.  Otevřete soubor **`index.html`** ve webovém prohlížeči (např. Google Chrome nebo Firefox).

---

## 🌐 Stav Online Multiplayeru

xD trying my best

---

## 📜 Herní Základ

Cílem je dobýt **Prapor** (`F`) soupeře.

| Figurka | Síla | Speciální Pravidlo |
| :--- | :--- | :--- |
| **Maršál** | 10 | Nejsilnější, ale prohraje se Špionem. |
| **Špion** | 2 | Porazí Maršála (10) pouze v útoku. |
| **Minér** | 4 | Jako jediný zneškodní **Bombu** (`B`). |
| **Průzkumník** | 3 | Neomezený pohyb po přímé, volné cestě. |
| **Bomba** | B (11) | Nepohyblivá. Zničí útočící figurku (kromě Minéra). |