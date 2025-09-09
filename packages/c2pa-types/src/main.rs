// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::{fs, path::Path};

use c2pa::Reader;
use schemars::{schema::RootSchema, schema_for};

fn main() {
    let output_dir = Path::new("./schemas");

    if fs::exists(output_dir).unwrap() {
        fs::remove_dir_all(output_dir).expect("Could not clear existing schema directory");
    }

    fs::create_dir_all(output_dir).expect("Could not create schema directory");

    write_schema(&schema_for!(Reader), &"ManifestStore", output_dir);
}

fn write_schema(schema: &RootSchema, name: &str, output_dir: &Path) {
    println!("Exporting JSON schema for {name}");
    let output_path = output_dir.join(format!("{name}.json"));
    let output = serde_json::to_string_pretty(schema).expect("Failed to serialize schema");
    fs::write(&output_path, output).expect("Unable to write schema");
    println!("Wrote schema to {}", output_path.display());
}
