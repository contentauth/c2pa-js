/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { WorkerManager } from './worker/workerManager.js';
import { getSerializablePayload, type Signer } from './signer.js';
import type {
  Action,
  AssertionDefinition,
  BuilderIntent,
  C2paReason,
  Ingredient,
  ManifestDefinition
} from '@contentauth/c2pa-types';
import { Context } from '@contentauth/c2pa-utilities';
import type { C2pa } from './c2pa.js';

/**
 * Flattens the actions from every `c2pa.actions` assertion, since a manifest may carry both a
 * created-list and a gathered-list assertion, in positional order.
 *
 * This enumeration is coupled to c2pa-rs. `filterActions` maps the caller's predicate
 * over this flat list to compute a set of indices, and the wasm `filterActionsAt` binding walks
 * c2pa-rs `Builder::filter_actions`, which visits actions in the same order: every assertion
 * whose label starts with `c2pa.actions`, in `definition.assertions` order, each assertion's
 * `actions` array in order. If the two orderings ever diverge, filtering silently targets the
 * wrong actions. The ordering ideally comes authoritatively from Rust, but c2pa-rs exposes no
 * public actions accessor, so we mirror the rule here. The `filterActions` "multi actions-assertion"
 * spec pins this against real filtering.
 */
function getActionsFromDefinition(definition: ManifestDefinition): Action[] {
  return getActionGroupsFromDefinition(definition).flat();
}

/**
 * The same enumeration as {@link getActionsFromDefinition}, but kept grouped per
 * action assertion instead of flattened.
 */
function getActionGroupsFromDefinition(
  definition: ManifestDefinition
): Action[][] {
  return (definition.assertions ?? [])
    .filter((a: AssertionDefinition) => a.label.startsWith('c2pa.actions'))
    .map((a: AssertionDefinition) => {
      const data = a.data as { actions?: Action[] } | undefined;
      return data?.actions ?? [];
    });
}

export interface ManifestAndAssetBytes {
  manifest: Uint8Array<ArrayBuffer>;
  asset: Uint8Array<ArrayBuffer>;
}

// Module-level registry for garbage collection
const registry = new FinalizationRegistry<{ worker: WorkerManager; id: number }>(
  ({ worker, id }) => {
    worker.tx.builder_free(id);
  }
);

/**
 * The `Builder` class supports building C2PA manifests and signing assets.
 */
export class Builder {
  // Native private fields, which are inaccessible from outside the class at runtime.
  // These properties cannot leak and will not appear if the builder object is logged
  // or serialized.
  #worker: WorkerManager;
  #id: number;

  private constructor(worker: WorkerManager, id: number) {
    this.#worker = worker;
    this.#id = id;
  }

  /**
   * Create a {@link Builder} with a minimal manifest definition as its initial state.
   *
   * @param c2pa The `C2pa` instance (from {@link createC2pa}) to create this builder on.
   * @param context Optional `Context` configuring this builder's behavior.
   * @returns A {@link Builder} object.
   */
  static async new(c2pa: C2pa, context: Context = new Context()): Promise<Builder> {
    const settingsJson = await context.toJson();
    const { worker } = c2pa;

    const builderId = await worker.tx.builder_new(settingsJson);

    const builder = new Builder(worker, builderId);
    registry.register(builder, { worker, id: builderId }, builder);

    return builder;
  }

  /**
   * Create a {@link Builder} from a {@link ManifestDefinition}.
   *
   * @param c2pa The `C2pa` instance (from {@link createC2pa}) to create this builder on.
   * @param definition The {@link ManifestDefinition} to be used as the builder's initial state.
   * @param context Optional `Context` configuring this builder's behavior.
   * @returns A {@link Builder} object.
   */
  static async fromDefinition(
    c2pa: C2pa,
    definition: ManifestDefinition,
    context: Context = new Context()
  ): Promise<Builder> {
    const json = JSON.stringify(definition);
    const settingsJson = await context.toJson();
    const { worker } = c2pa;

    const builderId = await worker.tx.builder_fromJson(json, settingsJson);

    const builder = new Builder(worker, builderId);
    registry.register(builder, { worker, id: builderId }, builder);

    return builder;
  }

  /**
   * Create a {@link Builder} from a builder archive (created from {@link Builder.toArchive}).
   *
   * @param c2pa The `C2pa` instance (from {@link createC2pa}) to create this builder on.
   * @param archive Builder archive as a blob.
   * @param context Optional `Context` configuring this builder's behavior.
   * @returns A {@link Builder} object.
   */
  static async fromArchive(
    c2pa: C2pa,
    archive: Blob,
    context: Context = new Context()
  ): Promise<Builder> {
    const settingsJson = await context.toJson();
    const { worker } = c2pa;

    const builderId = await worker.tx.builder_fromArchive(archive, settingsJson);

    const builder = new Builder(worker, builderId);
    registry.register(builder, { worker, id: builderId }, builder);

    return builder;
  }

  /**
   * Sets the builder "intent."
   *
   * @todo Additional documentation coming soon.
   *
   * @param intent
   */
  async setIntent(intent: BuilderIntent): Promise<void> {
    await this.#worker.tx.builder_setIntent(this.#id, intent);
  }

  /**
   * Add an action to the manifest's actions assertion.
   *
   * @param action Object representing the action to be added.
   */
  async addAction(action: Action): Promise<void> {
    await this.#worker.tx.builder_addAction(this.#id, action);
  }

  /**
   * Add an assertion to the manifest under the given label.
   *
   * @param label The assertion label (reverse-domain format).
   * @param data The assertion data (any JSON-serializable value).
   */
  async addAssertion(label: string, data: unknown): Promise<void> {
    await this.#worker.tx.builder_addAssertion(this.#id, label, data);
  }

  /**
   * Redact an assertion from an ingredient manifest.
   *
   * Adds the URI to the builder's redaction list and appends a `c2pa.redacted` action
   * with the given reason, as required by the C2PA spec.
   *
   * @param uri JUMBF URI of the assertion to redact.
   * @param reason The {@link C2paReason} for the redaction.
   */
  async addRedaction(uri: string, reason: C2paReason): Promise<void> {
    await this.#worker.tx.builder_addRedaction(this.#id, uri, reason);
  }

  /**
   * Sets the remote URL for a remote manifest. The manifest is expected to be available at this location.
   *
   * @param url URL pointing to the location the remote manifest will be stored.
   */
  async setRemoteUrl(url: string): Promise<void> {
    await this.#worker.tx.builder_setRemoteUrl(this.#id, url);
  }

  /**
   * Sets the state of the no_embed flag.
   * To skip embedding a manifest (e.g. for the remote-only case), set this to `true`.
   *
   * @param noEmbed Value to set the no_embed flag.
   */
  async setNoEmbed(noEmbed: boolean): Promise<void> {
    await this.#worker.tx.builder_setNoEmbed(this.#id, noEmbed);
  }

  /**
   * Set a thumbnail from a blob to be included in the manifest. The blob should represent the asset being signed.
   *
   * @param format Format of the thumbnail
   * @param blob Blob of the thumbnail bytes
   */
  async setThumbnailFromBlob(format: string, blob: Blob): Promise<void> {
    await this.#worker.tx.builder_setThumbnailFromBlob(this.#id, format, blob);
  }

  /**
   * Experimental.
   * Retains only the actions for which `keep` returns true.
   *
   * The inception action, `c2pa.created` or `c2pa.opened`, is always kept regardless of `keep`,
   * and is moved to index 0 if needed, so the manifest stays valid per the C2PA spec. Sets
   * `allActionsIncluded = false` when anything is removed. This does not touch ingredients.
   * Call {@link Builder.filterIngredients}, using `filterIngredients(() => false)` to drop all
   * orphans, afterwards if you also want to drop ingredients now orphaned by the removed
   * actions.
   *
   * Unlike the Node binding, Neon, which can invoke the JS predicate synchronously from Rust,
   * the WASM builder lives in a Web Worker. A predicate closure can't be called across the
   * worker boundary, so we evaluate it here on the main thread and send the resulting indices
   * to the worker, where WASM applies the equivalent index-based filter. The action/ingredient
   * ordering here must match what WASM iterates. See `filterActionsAt` and `filterIngredientsAt`.
   *
   * @param keep The action is retained when the predicate returns true.
   */
  async filterActions(keep: (action: Action) => boolean): Promise<void> {
    const definition: ManifestDefinition = await this.#worker.tx.builder_getDefinition(
      this.#id
    );
    const actions = getActionsFromDefinition(definition);
    const indices = actions.reduce<number[]>((kept, action, i) => {
      if (keep(action)) {
        kept.push(i);
      }
      return kept;
    }, []);
    await this.#worker.tx.builder_filterActionsAt(this.#id, indices);
  }

  /**
   * Experimental.
   * Retains ingredients, then rewrites positional ingredient references so linked actions
   * stay valid.
   *
   * An ingredient is kept if it is referenced by a current action, is a `parentOf` ingredient,
   * or `rescue` returns true for it. `rescue` therefore only ever rescues an otherwise-orphaned
   * ingredient. It can never drop a referenced or lineage ingredient. Call
   * {@link Builder.filterActions} first if you are also removing actions: the keep-set is
   * computed from whatever actions currently remain.
   *
   * @param rescue Can rescue an otherwise-orphaned ingredient by returning true.
   */
  async filterIngredients(
    rescue: (ingredient: Ingredient) => boolean
  ): Promise<void> {
    const definition: ManifestDefinition = await this.#worker.tx.builder_getDefinition(
      this.#id
    );
    const ingredients: Ingredient[] = definition.ingredients ?? [];
    const indices = ingredients.reduce<number[]>((rescued, ingredient, i) => {
      if (rescue(ingredient)) {
        rescued.push(i);
      }
      return rescued;
    }, []);
    await this.#worker.tx.builder_filterIngredientsAt(this.#id, indices);
  }

  /**
   * Experimental.
   * Retains actions and ingredients together in one step.
   *
   * `rescueIngredient` is evaluated for every ingredient first; any action referencing an
   * ingredient it would rescue is force-kept regardless of `keepAction`.
   *
   * @param keepAction The action is retained when the predicate returns true.
   * @param rescueIngredient Can rescue an otherwise-orphaned ingredient (and the action
   * referencing it) by returning true.
   */
  async filterActionsAndIngredients(
    keepAction: (action: Action) => boolean,
    rescueIngredient: (ingredient: Ingredient) => boolean
  ): Promise<void> {
    const definition: ManifestDefinition = await this.#worker.tx.builder_getDefinition(
      this.#id
    );
    const actions = getActionsFromDefinition(definition);
    const actionIndices = actions.reduce<number[]>((kept, action, i) => {
      if (keepAction(action)) {
        kept.push(i);
      }
      return kept;
    }, []);
    const ingredients: Ingredient[] = definition.ingredients ?? [];
    const ingredientIndices = ingredients.reduce<number[]>(
      (rescued, ingredient, i) => {
        if (rescueIngredient(ingredient)) {
          rescued.push(i);
        }
        return rescued;
      },
      []
    );
    await this.#worker.tx.builder_filterActionsAndIngredientsAt(
      this.#id,
      actionIndices,
      ingredientIndices
    );
  }

  /**
   * Replaces the actions in the `c2pa.actions`/`c2pa.actions.v2` assertions.
   *
   * A manifest can carry more than one actions assertion (the created-list and
   * gathered-list entries are distinct assertions). `transform` is therefore
   * invoked once per actions assertion, in positional order, with that
   * assertion's own actions.
   *
   * A no-op if there is no actions assertion. Use `addAction` for those.
   *
   * The returned list is written back as is.
   * `transform` can therefore produce an actions array that fails
   * validation at signing time, for example by removing the inception action
   * (`c2pa.created`/`c2pa.opened`) or moving it out of first position.
   *
   * @param transform Receives one assertion's actions and returns its full replacement list.
   */
  async updateActions(
    transform: (actions: Action[]) => Action[]
  ): Promise<void> {
    const definition: ManifestDefinition = await this.#worker.tx.builder_getDefinition(
      this.#id
    );
    // One group per actions assertion: `transform` runs once per assertion
    // Each is rewritten in place under its own label.
    const groups = getActionGroupsFromDefinition(definition);
    const updated = groups.map((actions) => transform(actions));
    await this.#worker.tx.builder_updateActionsAt(this.#id, updated);
  }

  /**
   * Add an ingredient to the builder from a definition only.
   *
   * @param ingredientDefinition {@link Ingredient} definition.
   */
  async addIngredient(ingredientDefinition: Ingredient): Promise<void> {
    const json = JSON.stringify(ingredientDefinition);
    await this.#worker.tx.builder_addIngredient(this.#id, json);
  }

  /**
   * Add an ingredient to the builder from a definition, format, and blob.
   * Values specified in the ingredient definition will be merged with the ingredient, and these values take precendence.
   *
   * @param ingredientDefinition {@link Ingredient} definition.
   * @param format Format of the ingredient.
   * @param blob Blob of the ingredient's bytes.
   */
  async addIngredientFromBlob(
    ingredientDefinition: Ingredient,
    format: string,
    blob: Blob
  ): Promise<void> {
    const json = JSON.stringify(ingredientDefinition);
    await this.#worker.tx.builder_addIngredientFromBlob(this.#id, json, format, blob);
  }

  /**
   * Add a resource to the builder's resource store with an ID and blob of the resource's bytes.
   *
   * @param resourceId ID associated with the resource being added.
   * @param blob Blob of the resource's bytes.
   */
  async addResourceFromBlob(resourceId: string, blob: Blob): Promise<void> {
    await this.#worker.tx.builder_addResourceFromBlob(this.#id, resourceId, blob);
  }

  /**
   * Gets the current manifest definition held by the builder.
   *
   * @returns The {@link ManifestDefinition} held by the builder.
   */
  async getDefinition(): Promise<ManifestDefinition> {
    const definition = await this.#worker.tx.builder_getDefinition(this.#id);
    return definition;
  }

  /**
   * Save the builder into .c2pa format.
   * This "archive" can be added to as an ingredient with {@link addIngredientFromBlob}
   *
   * @returns A builder archive in application/c2pa format.
   */
  async toArchive(): Promise<Uint8Array<ArrayBuffer>> {
    const archive = await this.#worker.tx.builder_toArchive(this.#id);
    return archive;
  }

  /**
   * Sign an asset.
   *
   * @todo Docs coming soon
   */
  async sign(
    signer: Signer,
    format: string,
    blob: Blob
  ): Promise<Uint8Array<ArrayBuffer>> {
    const payload = await getSerializablePayload(signer);
    const requestId = this.#worker.registerSignReceiver(signer.sign);

    const result = await this.#worker.tx.builder_sign(
      this.#id,
      requestId,
      payload,
      format,
      blob
    );

    return result;
  }

  /**
   * Sign an asset and get both the signed asset bytes and the manifest bytes.
   *
   * @todo Docs coming soon
   */
  async signAndGetManifestBytes(
    signer: Signer,
    format: string,
    blob: Blob
  ): Promise<ManifestAndAssetBytes> {
    const payload = await getSerializablePayload(signer);
    const requestId = this.#worker.registerSignReceiver(signer.sign);

    const result = await this.#worker.tx.builder_signAndGetManifestBytes(
      this.#id,
      requestId,
      payload,
      format,
      blob
    );

    return result;
  }

  /**
   * Dispose of this Builder, freeing the memory it occupied and preventing further use. Call this whenever the Builder is no longer needed.
   */
  async free(): Promise<void> {
    registry.unregister(this);
    await this.#worker.tx.builder_free(this.#id);
  }
}
