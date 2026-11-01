import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateMoonAssets } from '../scripts/generate-moon-assets.mjs';

const runtimeRoot = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Pass the checked-out Android runtime directory.');
const releaseTag = process.argv[3] || 'v1.5.0-beta.3';
const appVersion = releaseTag.replace(/^v/, '');
const versionParts = appVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(?:alpha|beta|rc)\.(\d+))?$/);
if (!versionParts) throw new Error(`Invalid Android release tag: ${releaseTag}`);
const versionCode = Number(versionParts[1]) * 1_000_000
  + Number(versionParts[2]) * 10_000
  + Number(versionParts[3]) * 100
  + (versionParts[4] ? Number(versionParts[4]) : 99);

async function replaceOnce(file, before, after) {
  const source = await readFile(file, 'utf8');
  if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) {
    throw new Error(`Expected one rebrand anchor in ${file}: ${before}`);
  }
  await writeFile(file, source.replace(before, after));
}

const appRoot = path.join(runtimeRoot, 'app_pojavlauncher');
const gradleFile = path.join(appRoot, 'build.gradle');
const gradleChanges = [
  ['applicationId "org.angelauramc.amethyst"', 'applicationId "id.noom.launcher"'],
  ['versionCode 10000000', `versionCode ${versionCode}`],
  ['versionName getVersionName()', `versionName "${appVersion}"`],
  ["applicationIdSuffix '.debug'", "applicationIdSuffix ''"],
  ['resValue "string", "app_name", "Amethyst (Debug)"', 'resValue "string", "app_name", "Moon Launcher"'],
  ['resValue "string", "app_short_name", "Amethyst (Debug)"', 'resValue "string", "app_short_name", "Moon Launcher"'],
  ["resValue 'string', 'application_package', 'org.angelauramc.amethyst.debug'", "resValue 'string', 'application_package', 'id.noom.launcher'"],
  ["resValue 'string', 'storageProviderAuthorities', 'org.angelauramc.amethyst.scoped.gamefolder.debug'", "resValue 'string', 'storageProviderAuthorities', 'id.noom.launcher.scoped.gamefolder'"],
  ["resValue 'string', 'shareProviderAuthority', 'org.angelauramc.amethyst.scoped.controlfolder.debug'", "resValue 'string', 'shareProviderAuthority', 'id.noom.launcher.scoped.controlfolder'"],
  ['resValue "string", "app_name", "Amethyst"', 'resValue "string", "app_name", "Moon Launcher"'],
  ['resValue "string", "app_short_name", "Amethyst"', 'resValue "string", "app_short_name", "Moon Launcher"'],
  ["resValue 'string', 'application_package', 'org.angelauramc.amethyst'", "resValue 'string', 'application_package', 'id.noom.launcher'"],
  ["resValue 'string', 'storageProviderAuthorities', 'org.angelauramc.amethyst.scoped.gamefolder'", "resValue 'string', 'storageProviderAuthorities', 'id.noom.launcher.scoped.gamefolder'"],
];
for (const [before, after] of gradleChanges) await replaceOnce(gradleFile, before, after);

async function rebrandStrings(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await rebrandStrings(file);
    } else if (entry.name.endsWith('.xml')) {
      const source = await readFile(file, 'utf8');
      const branded = source.replaceAll('Amethyst', 'Moon Launcher');
      if (source !== branded) await writeFile(file, branded);
    }
  }
}

await rebrandStrings(path.join(appRoot, 'src/main/res'));

const resources = path.join(appRoot, 'src/main/res');
const stylesFile = path.join(resources, 'values/styles.xml');
await replaceOnce(
  stylesFile,
  `<style name="LauncherMenuButton.Universal" parent="LauncherMenuButton">
        <item name="android:layout_height">@dimen/_66sdp</item>
    </style>`,
  `<style name="LauncherMenuButton.Universal" parent="LauncherMenuButton">
        <item name="android:layout_height">@dimen/_66sdp</item>
        <item name="android:background">@drawable/moon_action_background</item>
        <item name="android:textColor">@color/primary_text</item>
        <item name="android:textAllCaps">false</item>
        <item name="android:drawablePadding">@dimen/padding_medium</item>
        <item name="android:paddingStart">@dimen/padding_medium</item>
        <item name="android:paddingEnd">@dimen/padding_medium</item>
    </style>`,
);
await writeFile(
  path.join(resources, 'drawable/moon_dashboard_hero.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <corners android:radius="14dp" />
    <gradient android:angle="0" android:startColor="#26372E" android:endColor="#151814" />
    <stroke android:width="1dp" android:color="#526858" />
</shape>
`,
);
await writeFile(
  path.join(resources, 'drawable/moon_action_surface.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <corners android:radius="10dp" />
    <solid android:color="#1B211B" />
    <stroke android:width="1dp" android:color="#343D33" />
</shape>
`,
);
await writeFile(
  path.join(resources, 'drawable/moon_action_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<ripple xmlns:android="http://schemas.android.com/apk/res/android" android:color="#3379CBA4">
    <item android:drawable="@drawable/moon_action_surface" />
</ripple>
`,
);
const colorsFile = path.join(resources, 'values/colors.xml');
for (const [before, after] of [
  ['<color name="minebutton_color">#9649b8</color>', '<color name="minebutton_color">#C5EE58</color>'],
  ['<color name="background_app">#181818</color>', '<color name="background_app">#10120F</color>'],
  ['<color name="background_overlay">#464646</color>', '<color name="background_overlay">#292D26</color>'],
  ['<color name="background_status_bar">#242424</color>', '<color name="background_status_bar">#10120F</color>'],
  ['<color name="background_bottom_bar">#232323</color>', '<color name="background_bottom_bar">#151814</color>'],
  ['<color name="primary_text">#FFFFFF</color>', '<color name="primary_text">#EEEEDE</color>'],
  ['<color name="secondary_text">#B2B2B2</color>', '<color name="secondary_text">#888C80</color>'],
]) await replaceOnce(colorsFile, before, after);

await replaceOnce(
  colorsFile,
  '</resources>',
  '    <color name="moon_accent">#C5EE58</color>\n</resources>',
);

await replaceOnce(
  stylesFile,
  '<item name="windowActionBar">false</item>',
  '<item name="windowActionBar">false</item>\n        <item name="colorAccent">@color/moon_accent</item>\n        <item name="android:colorAccent">@color/moon_accent</item>',
);

await replaceOnce(
  path.join(appRoot, 'src/main/java/com/kdt/mcgui/MineButton.java'),
  'setBackground(ResourcesCompat.getDrawable(getResources(), R.drawable.mine_button_background, null));',
  'setBackground(ResourcesCompat.getDrawable(getResources(), R.drawable.mine_button_background, null));\n\t\tsetTextColor(ResourcesCompat.getColor(getResources(), R.color.background_app, null));',
);

const launcherLayout = path.join(resources, 'layout/fragment_launcher.xml');
const newsButtonAnchor = '\t\t\t<com.kdt.mcgui.LauncherMenuButton\n\t\t\t\tandroid:id="@+id/news_button"';
const moonHeader = `\t\t\t<LinearLayout
				android:id="@+id/moon_brand_header"
				android:layout_width="match_parent"
				android:layout_height="wrap_content"
				android:layout_marginHorizontal="@dimen/padding_medium"
				android:layout_marginTop="@dimen/padding_medium"
        android:background="@drawable/moon_dashboard_hero"
				android:gravity="center_vertical"
				android:orientation="horizontal"
				android:padding="@dimen/padding_medium"
        android:minHeight="@dimen/_92sdp"
				app:layout_constraintEnd_toEndOf="parent"
				app:layout_constraintStart_toStartOf="parent"
				app:layout_constraintTop_toTopOf="parent">
				<ImageView
          android:layout_width="@dimen/_56sdp"
          android:layout_height="@dimen/_56sdp"
					android:layout_marginEnd="@dimen/padding_medium"
					android:contentDescription="@string/app_name"
					android:src="@mipmap/ic_launcher" />
				<LinearLayout
					android:layout_width="0dp"
					android:layout_height="wrap_content"
					android:layout_weight="1"
					android:orientation="vertical">
					<TextView
						android:layout_width="match_parent"
						android:layout_height="wrap_content"
						android:text="@string/app_name"
						android:textColor="@color/primary_text"
						android:textSize="@dimen/_18ssp"
						android:textStyle="bold" />
					<TextView
						android:layout_width="match_parent"
						android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/padding_tiny"
            android:text="@string/moon_launcher_tagline"
            android:textColor="@color/moon_accent"
            android:textSize="@dimen/_9ssp"
            android:textStyle="bold" />
          <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/padding_tiny"
            android:text="@string/moon_launcher_subtitle"
            android:textColor="@color/secondary_text"
            android:textSize="@dimen/_8ssp" />
				</LinearLayout>
			</LinearLayout>

      <TextView
        android:id="@+id/moon_quick_access_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginHorizontal="@dimen/padding_medium"
        android:layout_marginTop="@dimen/padding_medium"
        android:text="@string/moon_quick_access_title"
        android:textColor="@color/primary_text"
        android:textSize="@dimen/_11ssp"
        android:textStyle="bold"
        app:layout_constraintTop_toBottomOf="@id/moon_brand_header" />

${newsButtonAnchor}`;
await replaceOnce(launcherLayout, newsButtonAnchor, moonHeader);
await replaceOnce(
  launcherLayout,
  'app:layout_constraintTop_toTopOf="parent"\n\t\t\t\tapp:layout_constraintStart_toStartOf="parent"\n\t\t\t\tapp:layout_constraintEnd_toStartOf="@id/social_divider"',
  'app:layout_constraintTop_toBottomOf="@id/moon_quick_access_title"\n\t\t\t\tapp:layout_constraintStart_toStartOf="parent"\n\t\t\t\tapp:layout_constraintEnd_toStartOf="@id/social_divider"',
);
await replaceOnce(
  launcherLayout,
  'app:layout_constraintTop_toTopOf="parent"\n\t\t\t\tapp:layout_constraintStart_toEndOf="@id/social_divider"',
  'app:layout_constraintTop_toBottomOf="@id/moon_quick_access_title"\n\t\t\t\tapp:layout_constraintStart_toEndOf="@id/social_divider"',
);
await replaceOnce(
  launcherLayout,
  `android:id="@+id/social_divider"
				style="@style/LauncherFragment_Divider"
				android:layout_marginVertical="@dimen/padding_large"
				app:layout_constraintTop_toTopOf="parent"`,
  `android:id="@+id/social_divider"
				style="@style/LauncherFragment_Divider"
				android:layout_marginVertical="@dimen/padding_large"
				app:layout_constraintTop_toBottomOf="@id/moon_quick_access_title"`,
);
await replaceOnce(
  launcherLayout,
  `android:id="@+id/custom_control_button"
				style="@style/LauncherMenuButton.Universal"
				android:layout_width="match_parent"
				android:drawableStart="@drawable/ic_menu_custom_controls"
				android:text="@string/mcl_option_customcontrol"
				app:layout_constraintTop_toBottomOf="@id/news_button"`,
  `android:id="@+id/custom_control_button"
				style="@style/LauncherMenuButton.Universal"
				android:layout_width="0dp"
				android:layout_marginEnd="@dimen/padding_tiny"
				android:drawableStart="@drawable/ic_menu_custom_controls"
				android:text="@string/mcl_option_customcontrol"
				app:layout_constraintTop_toBottomOf="@id/news_button"
				app:layout_constraintStart_toStartOf="parent"
				app:layout_constraintEnd_toStartOf="@id/center_guideline"`,
);
await replaceOnce(
  launcherLayout,
  `android:id="@+id/install_jar_button"
				style="@style/LauncherMenuButton.Universal"
				android:layout_width="match_parent"
				android:drawableStart="@drawable/ic_menu_install_jar"
				android:text="@string/main_install_jar_file"
				app:layout_constraintTop_toBottomOf="@id/custom_control_button"`,
  `android:id="@+id/install_jar_button"
				style="@style/LauncherMenuButton.Universal"
				android:layout_width="0dp"
				android:layout_marginStart="@dimen/padding_tiny"
				android:drawableStart="@drawable/ic_menu_install_jar"
				android:text="@string/main_install_jar_file"
				app:layout_constraintTop_toBottomOf="@id/discord_button"
				app:layout_constraintStart_toStartOf="@id/center_guideline"
				app:layout_constraintEnd_toEndOf="parent"`,
);
await replaceOnce(
  launcherLayout,
  '\t\t\t<com.kdt.mcgui.LauncherMenuButton\n\t\t\t\tandroid:id="@+id/share_logs_button"',
  '\t\t\t<com.kdt.mcgui.LauncherMenuButton\n\t\t\t\tandroid:id="@+id/modpack_button"\n\t\t\t\tstyle="@style/LauncherMenuButton.Universal"\n\t\t\t\tandroid:layout_width="0dp"\n\t\t\t\tandroid:layout_marginEnd="@dimen/padding_tiny"\n\t\t\t\tandroid:drawableStart="@drawable/ic_menu_install_jar"\n\t\t\t\tandroid:text="@string/moon_modpacks_shortcut"\n\t\t\t\tapp:layout_constraintTop_toBottomOf="@id/custom_control_button"\n\t\t\t\tapp:layout_constraintStart_toStartOf="parent"\n\t\t\t\tapp:layout_constraintEnd_toStartOf="@id/center_guideline" />\n\n\t\t\t<com.kdt.mcgui.LauncherMenuButton\n\t\t\t\tandroid:id="@+id/share_logs_button"',
);
await replaceOnce(
  launcherLayout,
  '\t\t\t<com.kdt.mcgui.LauncherMenuButton\n\t\t\t\tandroid:id="@+id/share_logs_button"\n\t\t\t\tstyle="@style/LauncherMenuButton.Universal"\n\t\t\t\tandroid:layout_width="match_parent"\n\t\t\t\tandroid:drawableStart="@android:drawable/ic_menu_share"\n\t\t\t\tandroid:text="@string/main_share_logs"\n\t\t\t\tapp:layout_constraintTop_toBottomOf="@id/install_jar_button" />',
  '\t\t\t<com.kdt.mcgui.LauncherMenuButton\n\t\t\t\tandroid:id="@+id/share_logs_button"\n\t\t\t\tstyle="@style/LauncherMenuButton.Universal"\n\t\t\t\tandroid:layout_width="0dp"\n\t\t\t\tandroid:layout_marginStart="@dimen/padding_tiny"\n\t\t\t\tandroid:drawableStart="@android:drawable/ic_menu_share"\n\t\t\t\tandroid:text="@string/main_share_logs"\n\t\t\t\tapp:layout_constraintTop_toBottomOf="@id/install_jar_button"\n\t\t\t\tapp:layout_constraintStart_toStartOf="@id/center_guideline"\n\t\t\t\tapp:layout_constraintEnd_toEndOf="parent" />',
);
await replaceOnce(
  launcherLayout,
  'app:layout_constraintTop_toBottomOf="@id/share_logs_button"',
  'app:layout_constraintTop_toBottomOf="@id/modpack_button"',
);
await replaceOnce(
  launcherLayout,
  'android:text="@string/main_play"',
  'android:text="@string/main_play"\n\t\tandroid:textColor="@color/background_app"',
);

await replaceOnce(
  path.join(resources, 'values/strings.xml'),
  '</resources>',
  '    <string name="moon_launcher_tagline">MINECRAFT JAVA EDITION</string>\n    <string name="moon_launcher_subtitle">YOUR WORLD. YOUR SETTINGS. ONE LAUNCHER.</string>\n    <string name="moon_quick_access_title">QUICK ACCESS</string>\n    <string name="moon_modpacks_shortcut">Modpacks</string>\n</resources>',
);

const mainMenuFile = path.join(appRoot, 'src/main/java/net/kdt/pojavlaunch/fragments/MainMenuFragment.java');
await replaceOnce(
  mainMenuFile,
  'Button mInstallJarButton = view.findViewById(R.id.install_jar_button);',
  'Button mInstallJarButton = view.findViewById(R.id.install_jar_button);\n        Button mModpackButton = view.findViewById(R.id.modpack_button);',
);
await replaceOnce(
  mainMenuFile,
  'mCustomControlButton.setOnClickListener(v -> startActivity(new Intent(requireContext(), CustomControlsActivity.class)));',
  'mCustomControlButton.setOnClickListener(v -> startActivity(new Intent(requireContext(), CustomControlsActivity.class)));\n        mModpackButton.setOnClickListener(v -> Tools.swapFragment(requireActivity(), ModpackCreateFragment.class, ModpackCreateFragment.TAG, null));',
);

const iconDirectory = await mkdtemp(path.join(os.tmpdir(), 'moon-android-icons-'));
try {
  await generateMoonAssets(iconDirectory);
  for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    const folder = path.join(resources, `mipmap-${density}`);
    await mkdir(folder, { recursive: true });
    await copyFile(path.join(iconDirectory, `icon-${density}.png`), path.join(folder, 'ic_launcher.png'));
    await copyFile(path.join(iconDirectory, `icon-${density}.png`), path.join(folder, 'ic_launcher_round.png'));
    await copyFile(path.join(iconDirectory, `foreground-${density}.png`), path.join(folder, 'ic_launcher_foreground.png'));
    await copyFile(path.join(iconDirectory, `background-${density}.png`), path.join(folder, 'ic_launcher_background.png'));
    for (const name of ['ic_launcher.webp', 'ic_launcher_round.webp', 'ic_launcher_foreground.webp', 'ic_launcher_background.webp']) {
      await rm(path.join(folder, name), { force: true });
    }
  }
} finally {
  await rm(iconDirectory, { recursive: true, force: true });
}

await replaceOnce(
  path.join(resources, 'values/ic_launcher_background.xml'),
  '<color name="ic_launcher_background">#FFFFFF</color>',
  '<color name="ic_launcher_background">#10120F</color>',
);

const upstreamLicense = await readFile(path.join(runtimeRoot, 'LICENSE'), 'utf8');
const notices = await readFile(path.resolve('android/THIRD_PARTY_NOTICES.md'), 'utf8');
const assets = path.join(appRoot, 'src/main/assets');
await mkdir(assets, { recursive: true });
await writeFile(path.join(assets, 'moon-third-party-notices.txt'), `${notices}\n\n${upstreamLicense}`);

console.log(`Prepared standalone Moon Android launcher ${appVersion}.`);