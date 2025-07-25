// Copyright 2023 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::sync::OnceLock;
use tokio::runtime::{Builder, Runtime};

// Store tokio runtime in a singleton
static RUNTIME: OnceLock<Runtime> = OnceLock::new();

pub fn runtime() -> &'static Runtime {
    RUNTIME.get_or_init(|| {
        Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("Failed to build runtime")
    })
}
