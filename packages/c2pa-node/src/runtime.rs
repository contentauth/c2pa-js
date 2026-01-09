// Copyright 2023 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::sync::{Arc, OnceLock};
use tokio::runtime::{Builder, Runtime};

// Runtime singleton - no longer needs reload functionality since settings are per-instance
static RUNTIME: OnceLock<Arc<Runtime>> = OnceLock::new();

fn build_runtime() -> Arc<Runtime> {
    let rt = Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("Failed to build runtime");
    Arc::new(rt)
}

pub fn runtime() -> Arc<Runtime> {
    RUNTIME.get_or_init(build_runtime).clone()
}
