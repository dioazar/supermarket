<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    /** La raíz no tiene página propia: manda al login. */
    public function test_the_application_redirects_to_login(): void
    {
        $this->get('/')->assertRedirect(route('login'));
    }
}
