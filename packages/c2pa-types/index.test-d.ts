/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { Role } from './index.js';

type Assert<T extends true> = T;

export type KnownRoleRemainsAccepted = Assert<
  'c2pa.edited' extends Role ? true : false
>;
export type RoleRemainsStringUnion = Assert<Role extends string ? true : false>;
export type UnknownRolesRemainRejected = Assert<
  'org.example.custom' extends Role ? false : true
>;
