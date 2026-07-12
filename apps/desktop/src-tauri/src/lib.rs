//! Thin Tauri shell — no product logic here.
//! UI and sim live in `apps/web` + `packages/sim-core`.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running OrbitLab desktop");
}
