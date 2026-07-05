<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Image\Image;

/**
 * Guarda imágenes subidas en el disco público, achicadas con spatie/image
 * para que pesen poco y carguen rápido.
 */
class ImageStorage
{
    /**
     * @return string ruta relativa dentro del disco público
     */
    public static function store(UploadedFile $file, string $folder, int $maxSize = 512): string
    {
        $filename = Str::uuid().'.jpg';
        $path = "$folder/$filename";

        $absolute = Storage::disk('public')->path($path);
        Storage::disk('public')->makeDirectory($folder);

        Image::load($file->getRealPath())
            ->width($maxSize)
            ->height($maxSize)
            ->quality(82)
            ->save($absolute);

        return $path;
    }

    public static function delete(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }
}
