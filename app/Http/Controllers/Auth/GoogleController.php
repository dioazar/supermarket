<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AccountSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    /**
     * Esquemas permitidos para volver a la app móvil con el token
     * (Expo Go usa exp://, el build nativo usa mobile://).
     */
    private const MOBILE_SCHEMES = ['exp://', 'mobile://', 'http://localhost', 'https://localhost'];

    public function redirect(Request $request)
    {
        abort_unless(config('services.google.client_id'), 404);

        // La app manda ?mobile=1&redirect_uri=...: al volver de Google le
        // devolvemos un token Sanctum en vez de crear sesión web.
        if ($request->boolean('mobile')) {
            $uri = (string) $request->query('redirect_uri', '');
            abort_unless(Str::startsWith($uri, self::MOBILE_SCHEMES), 422, 'redirect_uri inválido');
            $request->session()->put('google_mobile_redirect', $uri);
        } else {
            $request->session()->forget('google_mobile_redirect');
        }

        return Socialite::driver('google')
            ->redirectUrl(self::callbackUrl($request))
            ->redirect();
    }

    /**
     * Callback en el mismo host desde el que se inició el flujo (la web usa
     * lista-supermercado.test y la app localhost:8000; con host fijo se
     * perdería la sesión al volver de Google). Registrar ambas URIs en
     * Google Cloud Console.
     */
    private static function callbackUrl(Request $request): string
    {
        return $request->getSchemeAndHttpHost().'/auth/google/callback';
    }

    public function callback(Request $request)
    {
        abort_unless(config('services.google.client_id'), 404);

        $googleUser = Socialite::driver('google')
            ->redirectUrl(self::callbackUrl($request))
            ->user();

        $user = User::where('google_id', $googleUser->getId())
            ->orWhere('email', $googleUser->getEmail())
            ->first();

        if ($user) {
            // Vincula la cuenta existente (registrada con email) a Google.
            $user->update(['google_id' => $googleUser->getId()]);
        } else {
            $user = User::create([
                'name' => $googleUser->getName() ?: $googleUser->getEmail(),
                'email' => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'password' => null,
                'email_verified_at' => now(),
            ]);

            AccountSeeder::seed($user);
        }

        if ($mobileRedirect = $request->session()->pull('google_mobile_redirect')) {
            $token = $user->createToken('superlista-app')->plainTextToken;
            $separator = str_contains($mobileRedirect, '?') ? '&' : '?';

            return redirect()->away($mobileRedirect.$separator.'token='.urlencode($token));
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }
}
