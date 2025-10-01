[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / loadSettingsFromFile

# Function: loadSettingsFromFile()

> **loadSettingsFromFile**(`filePath`): `Promise`\<`void`\>

Defined in: [Settings.ts:41](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Settings.ts#L41)

Load settings from a TOML or JSON file path and apply them globally.
The file format is determined by the file extension (.toml for TOML, otherwise JSON).

## Parameters

### filePath

`string`

The path to the settings file

## Returns

`Promise`\<`void`\>
