import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateMoonAssets } from '../scripts/generate-moon-assets.mjs';

const runtimeRoot = path.resolve(process.argv[2] || '');
const releaseTag = process.argv[3] || 'v2.1.3-beta.1';
if (!runtimeRoot) throw new Error('Pass the checked-out Zalith runtime directory.');

const appVersion = releaseTag.replace(/^v/, '');
const versionMatch = appVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(?:alpha|beta|rc)\.(\d+))?$/);
if (!versionMatch) throw new Error(`Invalid Android release tag: ${releaseTag}`);
const versionCode = Number(versionMatch[1]) * 1_000_000
  + Number(versionMatch[2]) * 10_000
  + Number(versionMatch[3]) * 100
  + (versionMatch[4] ? Number(versionMatch[4]) : 99);

const propertiesFile = path.join(runtimeRoot, 'ZalithLauncher/gradle.properties');
let properties = await readFile(propertiesFile, 'utf8');
properties = properties
  .replace(/^launcher_app_name=.*$/m, 'launcher_app_name=Moon Launcher')
  .replace(/^launcher_name=.*$/m, 'launcher_name=MoonLauncher')
  .replace(/^launcher_short_name=.*$/m, 'launcher_short_name=Moon')
  .replace(/^launcher_version_code=.*$/m, `launcher_version_code=${versionCode}`)
  .replace(/^launcher_version_name=.*$/m, `launcher_version_name=${appVersion}`);
if (!/^launcher_short_name=/m.test(properties)) properties += '\nlauncher_short_name=Moon';
if (!/^launcher_version_code=/m.test(properties)) properties += `\nlauncher_version_code=${versionCode}`;
if (!/^launcher_version_name=/m.test(properties)) properties += `\nlauncher_version_name=${appVersion}`;
await writeFile(propertiesFile, properties);

const androidRes = path.join(runtimeRoot, 'ZalithLauncher/src/main/res');

const moonAssets = path.join(runtimeRoot, '.moon-assets');
await generateMoonAssets(moonAssets);

const densityDirs = {
  mdpi: 'icon-mdpi.png',
  hdpi: 'icon-hdpi.png',
  xhdpi: 'icon-xhdpi.png',
  xxhdpi: 'icon-xxhdpi.png',
  xxxhdpi: 'icon-xxxhdpi.png',
};
for (const [density, assetName] of Object.entries(densityDirs)) {
  const mipmapDir = path.join(androidRes, `mipmap-${density}`);
  await mkdir(mipmapDir, { recursive: true });
  await rm(path.join(mipmapDir, 'ic_launcher.png'), { force: true });
  await rm(path.join(mipmapDir, 'ic_launcher_round.png'), { force: true });
  await rm(path.join(mipmapDir, 'ic_launcher.webp'), { force: true });
  await rm(path.join(mipmapDir, 'ic_launcher_round.webp'), { force: true });
  await copyFile(path.join(moonAssets, 'moon-logo.png'), path.join(mipmapDir, 'ic_launcher.png'));
  await copyFile(path.join(moonAssets, 'moon-logo.png'), path.join(mipmapDir, 'ic_launcher_round.png'));
  await copyFile(path.join(moonAssets, assetName), path.join(mipmapDir, 'ic_launcher_foreground.png'));
}

for (const adaptiveIcon of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  await writeFile(path.join(androidRes, 'mipmap-anydpi-v26', adaptiveIcon), `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`);
}

const moonVector = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#C5EE58" android:pathData="M54,15a39,39 0,1 0,39 39A32,32 0,0 1,54 15z"/>
    <path android:fillColor="#E17E5A" android:pathData="M78,72h8v8h-8z"/>
    <path android:fillColor="#EEEED E" android:pathData="M30,27h3v3h-3z"/>
</vector>
`;
await writeFile(path.join(androidRes, 'drawable/ic_launcher_foreground.xml'), moonVector.replace('EEEED E', 'EEEEDE'));
await writeFile(path.join(androidRes, 'drawable/ic_launcher_monochrome.xml'), moonVector.replace(/#C5EE58|#E17E5A/g, '#FFFFFF').replace(/#EEEED E/, '#FFFFFF'));
await writeFile(path.join(androidRes, 'values/ic_launcher_background.xml'), `<resources>
    <color name="ic_launcher_background">#10120F</color>
</resources>
`);
await writeFile(path.join(androidRes, 'values/moon_launcher.xml'), `<resources>
    <color name="moon_background">#10120F</color>
    <color name="moon_panel">#151814</color>
    <color name="moon_lime">#C5EE58</color>
    <color name="moon_coral">#E17E5A</color>
    <color name="moon_ivory">#EEEEDE</color>
</resources>
`);

await writeFile(path.join(androidRes, 'values/colors.xml'), `<resources>
    <color name="black_or_white">#EEEEDE</color>
    <color name="background_app">#10120F</color>
    <color name="background_app_error">#40201B</color>
    <color name="background_overlay">#24271F</color>
    <color name="background_status_bar">#10120F</color>
    <color name="background_menu_top">#151814</color>
    <color name="background_menu_top_error">#8C3E30</color>
    <color name="background_menu_element">#C5EE58</color>
    <color name="background_ripple_effect">#4A503F</color>
    <color name="button_background">#24281F</color>
    <color name="button_background_selected">#3A4528</color>
    <color name="dialog_background">#181B16</color>
    <color name="menu_bar">#10120F</color>
    <color name="menu_bar_text">#EEEEDE</color>
    <color name="menu_overlay">#E5181814</color>
    <color name="menu_progress">#C5EE58</color>
    <color name="background_item">#CC20231C</color>
    <color name="background_item_selected">#D8384029</color>
    <color name="background_item_disabled">#D9322523</color>
    <color name="background_sponsor_intermediate">#CC5A4B1F</color>
    <color name="background_sponsor_advanced">#CCE17E5A</color>
    <color name="edit_box_fill">#20231C</color>
    <color name="edit_box_fill_selected">#303729</color>
    <color name="mod_category_fill">#80666F3A</color>
    <color name="text_background_fill">#B3282B24</color>
    <color name="settings_category">#C5EE58</color>
    <color name="favorite_color">#E17E5A</color>
    <color name="icon_color">#EEEEDE</color>
    <color name="primary_text">#EEEEDE</color>
</resources>
`);

const nightColors = path.join(androidRes, 'values-night/colors_night.xml');
await writeFile(nightColors, `<resources>
    <color name="background_app">#10120F</color>
    <color name="background_overlay">#24271F</color>
    <color name="background_status_bar">#10120F</color>
    <color name="background_menu_top">#151814</color>
    <color name="background_menu_element">#C5EE58</color>
    <color name="menu_bar_text">#EEEEDE</color>
    <color name="menu_progress">#C5EE58</color>
    <color name="primary_text">#EEEEDE</color>
</resources>
`);

const splashLayout = path.join(androidRes, 'layout/activity_splash.xml');
let splash = await readFile(splashLayout, 'utf8');
splash = splash.replace(
  '<androidx.constraintlayout.widget.ConstraintLayout\n        android:id="@+id/title_layout"',
  '<ImageView\n            android:id="@+id/moon_brand_logo"\n            android:layout_width="@dimen/_25sdp"\n            android:layout_height="@dimen/_25sdp"\n            android:layout_marginStart="@dimen/_8sdp"\n            android:contentDescription="@string/launcher_app_name"\n            android:src="@mipmap/ic_launcher"\n            app:layout_constraintBottom_toBottomOf="parent"\n            app:layout_constraintStart_toStartOf="parent"\n            app:layout_constraintTop_toTopOf="parent" />\n\n        <androidx.constraintlayout.widget.ConstraintLayout\n        android:id="@+id/title_layout"',
);
splash = splash.replace(
  'android:layout_marginStart="@dimen/_12sdp"\n            android:background="?android:attr/selectableItemBackground"',
  'android:layout_marginStart="@dimen/_38sdp"\n            android:background="?android:attr/selectableItemBackground"',
);
await writeFile(splashLayout, splash);
