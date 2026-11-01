plugins {
    java
}

group = "id.alwination"
version = "1.0.0"

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
    maven("https://repo.luckperms.net/")
}

dependencies {
    compileOnly("io.papermc.paper:paper-api:1.21.4-R0.1-SNAPSHOT")
    compileOnly("net.luckperms:api:5.4.141")
}

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(21))
}
