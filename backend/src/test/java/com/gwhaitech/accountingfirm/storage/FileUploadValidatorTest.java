package com.gwhaitech.accountingfirm.storage;

import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileUploadValidatorTest {

    private static final List<String> ALLOWED = List.of(
            "pdf", "jpg", "jpeg", "png", "xlsx", "xls", "csv", "doc", "docx");

    // Real PDF magic bytes — Tika detects as application/pdf
    private static final byte[] PDF_BYTES =
            "%PDF-1.4\n1 0 obj\n<< >>\nendobj\n%%EOF".getBytes(StandardCharsets.US_ASCII);

    // Windows PE MZ header — Tika detects as application/x-msdownload (or similar executable)
    private static final byte[] EXE_BYTES = {
        0x4D, 0x5A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    };

    private final StorageProperties props = new StorageProperties(
            Path.of("/tmp/uploads"), 10, 100, ALLOWED);
    private final FileUploadValidator validator = new FileUploadValidator(props);

    private MockMultipartFile file(String filename, String contentType) {
        return new MockMultipartFile("file", filename, contentType, "dummy content".getBytes());
    }

    private MockMultipartFile file(String filename, String contentType, byte[] content) {
        return new MockMultipartFile("file", filename, contentType, content);
    }

    // Minimal OOXML ZIP: contains [Content_Types].xml with the given part content type
    private static byte[] buildOoxml(String partContentType, String partName) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            zos.putNextEntry(new ZipEntry("[Content_Types].xml"));
            String xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
                "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
                "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
                "<Override PartName=\"/" + partName + "\" ContentType=\"" + partContentType + "\"/>" +
                "</Types>";
            zos.write(xml.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
        }
        return baos.toByteArray();
    }

    private static byte[] buildOoxmlXlsx() throws IOException {
        return buildOoxml(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
                "xl/workbook.xml");
    }

    private static byte[] buildOoxmlDocx() throws IOException {
        return buildOoxml(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
                "word/document.xml");
    }

    // Plain ZIP with no [Content_Types].xml — Tika detects as application/zip, not OOXML
    private static byte[] buildPlainZip() throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            zos.putNextEntry(new ZipEntry("readme.txt"));
            zos.write("hello".getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
        }
        return baos.toByteArray();
    }

    @Test
    void validate_acceptsHappyPath() {
        // Use real PDF bytes — Layer 3 (Tika) will verify content matches extension
        assertThatCode(() -> validator.validate(file("T4-2024.pdf", "application/pdf", PDF_BYTES)))
                .doesNotThrowAnyException();
    }

    @Test
    void validate_rejectsEmptyFilename() {
        assertThatThrownBy(() -> validator.validate(file("", "application/pdf")))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("must not be empty");
    }

    @Test
    void validate_rejectsNullFilename() {
        assertThatThrownBy(() -> validator.validate(
                new MockMultipartFile("file", null, "application/pdf", "x".getBytes())))
                .isInstanceOf(FileValidationException.class);
    }

    @Test
    void validate_rejectsOversizeFilename() {
        String tooLong = "a".repeat(101) + ".pdf";
        assertThatThrownBy(() -> validator.validate(file(tooLong, "application/pdf")))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("exceeds max length");
    }

    @Test
    void validate_rejectsPathTraversal() {
        assertThatThrownBy(() -> validator.validate(file("../secrets.pdf", "application/pdf")))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("illegal path characters");
        assertThatThrownBy(() -> validator.validate(file("a/b.pdf", "application/pdf")))
                .isInstanceOf(FileValidationException.class);
        assertThatThrownBy(() -> validator.validate(file("a\\b.pdf", "application/pdf")))
                .isInstanceOf(FileValidationException.class);
    }

    @Test
    void validate_rejectsDisallowedExtension() {
        assertThatThrownBy(() -> validator.validate(file("evil.exe", "application/octet-stream")))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("File type not allowed");
        assertThatThrownBy(() -> validator.validate(file("script.JS", "text/javascript")))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("File type not allowed");
        assertThatThrownBy(() -> validator.validate(file("archive.zip", "application/zip")))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("File type not allowed");
    }

    @Test
    void validate_rejectsNoExtension() {
        assertThatThrownBy(() -> validator.validate(file("README", "text/plain")))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("File type not allowed");
    }

    @Test
    void validate_rejectsOversizeBytes() {
        byte[] oversizeContent = new byte[11 * 1024 * 1024];
        assertThatThrownBy(() -> validator.validate(file("ok.pdf", "application/pdf", oversizeContent)))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("exceeds max size of 10 MB");
    }

    // --- Layer 2: declared MIME type checks ---

    @Test
    void validate_rejectsPdfWithOctetStreamContentType() {
        assertThatThrownBy(() -> validator.validate(file("tax.pdf", "application/octet-stream")))
                .isInstanceOf(FileValidationException.class);
    }

    @Test
    void validate_acceptsXlsxWithZipContentType() throws IOException {
        // Browsers may send application/zip for OOXML — Layer 2 accepts it, Layer 3 verifies OOXML structure
        assertThatCode(() -> validator.validate(
                file("report.xlsx", "application/zip", buildOoxmlXlsx())))
                .doesNotThrowAnyException();
    }

    @Test
    void validate_acceptsDocxWithZipContentType() throws IOException {
        assertThatCode(() -> validator.validate(
                file("doc.docx", "application/zip", buildOoxmlDocx())))
                .doesNotThrowAnyException();
    }

    // --- Layer 3: actual content (Tika) checks ---

    @Test
    void validate_rejectsExeBytesNamedAsPdf() {
        // MZ header disguised as PDF — Tika detects executable, not application/pdf
        assertThatThrownBy(() -> validator.validate(file("evil.pdf", "application/pdf", EXE_BYTES)))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("File content does not match its extension");
    }

    @Test
    void validate_rejectsPlainZipNamedAsXlsx() throws IOException {
        // ZIP without [Content_Types].xml — Tika returns application/zip, not OOXML
        byte[] plainZip = buildPlainZip();
        assertThatThrownBy(() -> validator.validate(file("evil.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", plainZip)))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("File content does not match its extension");
    }

    @Test
    void validate_acceptsCsvTextContent() {
        byte[] csvBytes = "name,age\nAlice,30\nBob,25".getBytes(StandardCharsets.UTF_8);
        assertThatCode(() -> validator.validate(file("data.csv", "text/csv", csvBytes)))
                .doesNotThrowAnyException();
    }

    @Test
    void validate_acceptsRealXlsxBytes() throws IOException {
        assertThatCode(() -> validator.validate(file("report.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                buildOoxmlXlsx())))
                .doesNotThrowAnyException();
    }
}
