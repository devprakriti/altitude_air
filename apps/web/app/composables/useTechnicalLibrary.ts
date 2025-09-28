import { ref } from "vue";

export type TechnicalLibraryFile = {
  id: number;
  filename: string;
  originalFilename: string;
  category: string;
  fileSize: number;
  mimeType: string;
  remarks: string | null;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TechnicalLibraryFilters = {
  category?: string;
  page?: number;
  pageSize?: number;
};

export type TechnicalLibraryResponse = {
  success: boolean;
  data: {
    files: TechnicalLibraryFile[];
    count: number;
  };
};

export type UploadTechnicalLibraryFileData = {
  file: File;
  filename: string;
  category: string;
  remarks?: string;
};

export const useTechnicalLibrary = () => {
  const { $eden } = useNuxtApp();
  const toast = useToast();

  const files = ref<TechnicalLibraryFile[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const totalCount = ref(0);
  const totalPages = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(10);
  const filters = ref<TechnicalLibraryFilters>({});

  const fetchFiles = async (params?: TechnicalLibraryFilters) => {
    isLoading.value = true;
    error.value = null;

    try {
      const queryParams = {
        ...filters.value,
        ...params,
        page: currentPage.value,
        pageSize: pageSize.value,
      };
      const response = await $eden["technical-library"].files.get(queryParams);

      if (response.data?.success && response.data.data) {
        files.value = response.data.data.files;
        totalCount.value = response.data.data.count;
        totalPages.value = Math.ceil(response.data.data.count / pageSize.value);
      } else {
        throw new Error("Failed to fetch technical library files");
      }
    } catch (err: any) {
      const errorMsg =
        err.message ||
        "An error occurred while fetching technical library files";
      toast.add({
        title: "Error",
        description: errorMsg,
        color: "error",
      });
    } finally {
      isLoading.value = false;
    }
  };

  const uploadFile = async (data: UploadTechnicalLibraryFileData) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await $eden["technical-library"].upload.post({
        file: data.file,
        filename: data.filename,
        category: data.category,
        remarks: data.remarks,
      });

      if (response.data?.success) {
        toast.add({
          title: "Success",
          description: "File uploaded successfully",
          color: "success",
        });
        await fetchFiles({ category: data.category });
        return response.data.data;
      }
      throw new Error("Failed to upload file");
    } catch (err: any) {
      const errorMsg = err.message || "An error occurred while uploading file";
      toast.add({
        title: "Error",
        description: errorMsg,
        color: "error",
      });
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const downloadFile = async (id: number) => {
    try {
      const response = await $eden["technical-library"].download({ id }).get();

      if (response.data?.success && response.data.data?.downloadUrl) {
        // Use the presigned URL for direct download
        const { downloadUrl, filename } = response.data.data;
        
        // Create a temporary link and trigger download
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename || `file-${id}`;
        a.target = "_blank"; // Open in new tab as fallback
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast.add({
          title: "Success",
          description: "File downloaded successfully",
          color: "success",
        });
        return true;
      }
      
      throw new Error(response.data?.error || "Failed to download file");
    } catch (err: any) {
      const errorMsg =
        err.message || "An error occurred while downloading file";
      toast.add({
        title: "Error",
        description: errorMsg,
        color: "error",
      });
      return false;
    }
  };

  const printFile = async (id: number) => {
    try {
      const response = await $eden["technical-library"].download({ id }).get();

      if (response.data?.success && response.data.data?.downloadUrl) {
        // Use the presigned URL to open file for printing
        const { downloadUrl } = response.data.data;
        
        // Open the file in a new window/tab for printing
        const printWindow = window.open(downloadUrl, '_blank');
        
        if (printWindow) {
          // Focus on the new window
          printWindow.focus();
          
          toast.add({
            title: "Success",
            description: "File opened for printing",
            color: "success",
          });
        } else {
          // Fallback if popup is blocked
          window.open(downloadUrl, '_blank');
          toast.add({
            title: "Info",
            description: "File opened in new tab. You can print from there.",
            color: "info",
          });
        }
        
        return true;
      }
      
      throw new Error(response.data?.error || "Failed to open file for printing");
    } catch (err: any) {
      const errorMsg =
        err.message || "An error occurred while opening file for printing";
      toast.add({
        title: "Error",
        description: errorMsg,
        color: "error",
      });
      return false;
    }
  };

  const deleteFile = async (id: number) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await $eden["technical-library"].files({ id }).delete();

      if (response.data?.success) {
        toast.add({
          title: "Success",
          description: "File deleted successfully",
          color: "success",
        });
        await fetchFiles();
        return true;
      }
      throw new Error("Failed to delete file");
    } catch (err: any) {
      const errorMsg = err.message || "An error occurred while deleting file";
      toast.add({
        title: "Error",
        description: errorMsg,
        color: "error",
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const setFilters = (newFilters: TechnicalLibraryFilters) => {
    filters.value = { ...newFilters };
    currentPage.value = 1;
    fetchFiles();
  };

  const setPage = (page: number) => {
    currentPage.value = page;
    fetchFiles();
  };

  const setPageSize = (size: number) => {
    pageSize.value = size;
    currentPage.value = 1;
    fetchFiles();
  };

  const clearFilters = () => {
    filters.value = {};
    currentPage.value = 1;
    fetchFiles();
  };

  const paginationInfo = computed(() => ({
    currentPage: currentPage.value,
    totalPages: totalPages.value,
    totalCount: totalCount.value,
    pageSize: pageSize.value,
    hasNextPage: currentPage.value < totalPages.value,
    hasPrevPage: currentPage.value > 1,
  }));

  return {
    files: readonly(files),
    isLoading: readonly(isLoading),
    error: readonly(error),
    totalCount: readonly(totalCount),
    totalPages: readonly(totalPages),
    currentPage: readonly(currentPage),
    pageSize: readonly(pageSize),
    filters: readonly(filters),
    paginationInfo,
    fetchFiles,
    uploadFile,
    downloadFile,
    printFile,
    deleteFile,
    setFilters,
    setPage,
    setPageSize,
    clearFilters,
  };
};
