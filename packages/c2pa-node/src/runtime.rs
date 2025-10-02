// Copyright 2023 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use crate::settings::get_global_settings_toml;
use c2pa::settings::Settings;
use std::sync::{Arc, OnceLock, RwLock};
use tokio::runtime::{Builder, Runtime};

// Runtime stored in a swap-able singleton to allow reloads after settings change
static RUNTIME: OnceLock<RwLock<Arc<Runtime>>> = OnceLock::new();

fn build_runtime() -> Arc<Runtime> {
    let rt = Builder::new_multi_thread()
        .enable_all()
        .on_thread_start(|| {
            // Apply the latest global TOML snapshot when each worker starts
            if let Some(toml) = get_global_settings_toml() {
                let _ = Settings::from_toml(&toml);
            }
        })
        .build()
        .expect("Failed to build runtime");
    Arc::new(rt)
}

pub fn runtime() -> Arc<Runtime> {
    let cell = RUNTIME.get_or_init(|| RwLock::new(build_runtime()));
    cell.read().unwrap().clone()
}

/// Rebuild the runtime so new worker threads use the latest global settings snapshot.
/// Existing tasks continue on the old runtime; its workers retire when idle.
pub fn reload_runtime() {
    let cell = RUNTIME.get_or_init(|| RwLock::new(build_runtime()));
    let new_rt = build_runtime();
    let old = {
        let mut w = cell.write().unwrap();
        std::mem::replace(&mut *w, new_rt)
    };
    // Let it drain in background
    // Drop Arc<Runtime>; cannot call shutdown_* after move. Tasks will drain naturally.
    drop(old);
}
