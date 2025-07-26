"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Search, MapPin, Star, Phone, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";


// Haversine formula to compute distance in kilometers
const getDistanceFromLatLon = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Radius of Earth in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
};

import { Heart } from "lucide-react";

const VetFinder = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [vets, setVets] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [sortOption, setSortOption] = useState("distance");
  const [favorites, setFavorites] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("favoriteVets");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const toggleFavorite = (vetId) => {
    setFavorites((prev) => {
      let updated;
      if (prev.includes(vetId)) {
        updated = prev.filter((id) => id !== vetId);
      } else {
        updated = [...prev, vetId];
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("favoriteVets", JSON.stringify(updated));
      }
      return updated;
    });
  };
  const filters = [
    { id: "all", label: "All" },
    { id: "favorites", label: "Favorites" },
    { id: "NCR", label: "NCR" },
    { id: "CAR", label: "CAR" },
    { id: "I", label: "Region I" },
    { id: "II", label: "Region II" },
    { id: "III", label: "Region III" },
    { id: "IV-A", label: "Region IV-A" },
    { id: "IV-B", label: "Region IV-B" },
    { id: "V", label: "Region V" },
    { id: "VI", label: "Region VI" },
    { id: "VII", label: "Region VII" },
    { id: "VIII", label: "Region VIII" },
    { id: "IX", label: "Region IX" },
    { id: "X", label: "Region X" },
    { id: "XI", label: "Region XI" },
    { id: "XII", label: "Region XII" },
    { id: "XIII", label: "Region XIII" },
  ];



  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
        setUserLocation(null);
      }
    );
  }, []);

  useEffect(() => {
    const fetchVets = async () => {
      try {
        const snapshot = await getDocs(collection(db, "vet_clinics"));
        const vetList = snapshot.docs.map((doc) => {
          const data = doc.data();

          const lat = data.latitude;
          const lng = data.longitude;

          let distance = null;
          if (userLocation && lat && lng) {
            distance = getDistanceFromLatLon(
              userLocation.latitude,
              userLocation.longitude,
              lat,
              lng
            );
          }

          return {
            id: doc.id,
            name: data.trade_name || "Unnamed Clinic",
            address: data.business_address || "Unknown Address",
            region: data.region || "N/A",
            contact: data.contact || "No contact",
            facebook_page: data.facebook_page || null,
            latitude: lat,
            longitude: lng,
            rating: Math.floor(Math.random() * 2) + 4.0,
            isOpen: true,
            distance: distance, // in km
          };
        });

        setVets(vetList);
      } catch (error) {
        console.error("Error fetching vet clinics:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userLocation !== null) {
      fetchVets();
    }
  }, [userLocation]);

  const filteredVets = vets
    .filter((vet) => {
      const matchesSearch =
        vet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vet.address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRegion =
        selectedFilter === "all" ||
        (selectedFilter === "favorites"
          ? favorites.includes(vet.id)
          : vet.region.toLowerCase().includes(selectedFilter.toLowerCase()));

      return matchesSearch && matchesRegion;
    })
    .sort((a, b) => {
      if (sortOption === "distance") {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      } else if (sortOption === "stars") {
        return b.rating - a.rating;
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary p-6 rounded-b-3xl">
        <h1 className="text-white font-bold mb-4">Find Veterinarians</h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/90 border-0"
          />
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="h-48 bg-muted m-6 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Map preview coming soon</p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={selectedFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter.id)}
              className="whitespace-nowrap"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Vet List */}
      <div className="px-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {loading ? "Loading..." : `${filteredVets.length} Vets Found`}
          </h2>
          <div className="relative inline-block text-left">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSortOptions(!showSortOptions)}
              aria-haspopup="true"
              aria-expanded={showSortOptions}
            >
              <Filter className="w-4 h-4 mr-2" />
              Sort
            </Button>
            {showSortOptions && (
              <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1">
                  <button
                    className={`block px-4 py-2 text-sm w-full text-left ${
                      sortOption === "distance" ? "bg-gray-100" : ""
                    }`}
                    onClick={() => {
                      setSortOption("distance");
                      setShowSortOptions(false);
                    }}
                  >
                    Distance (km)
                  </button>
                  <button
                    className={`block px-4 py-2 text-sm w-full text-left ${
                      sortOption === "stars" ? "bg-gray-100" : ""
                    }`}
                    onClick={() => {
                      setSortOption("stars");
                      setShowSortOptions(false);
                    }}
                  >
                    Stars
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!loading &&
          filteredVets.map((vet) => (
            <Card key={vet.id} className="hover:shadow-medium transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{vet.name}</h3>
                    <p className="text-sm text-muted-foreground">{vet.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(vet.id)}
                      aria-label={favorites.includes(vet.id) ? "Unfavorite" : "Favorite"}
                      className="focus:outline-none"
                    >
                      <Heart
                        className={`w-6 h-6 ${
                          favorites.includes(vet.id) ? "text-red-500 fill-current" : "text-gray-400"
                        }`}
                      />
                    </button>
                    <div className="px-2 py-1 rounded-full text-xs font-medium bg-success text-success-foreground">
                      Open
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {vet.distance != null
                      ? `${vet.distance.toFixed(1)} km`
                      : "Unknown"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-current text-yellow-500" />
                    {vet.rating}
                  </div>
                  <div className="flex items-center gap-1">
                    {vet.region}
                  </div>
                </div>

              <Button
                onClick={() => {
                  setSelectedClinic(vet);
                  setShowModal(true);
                }}
                size="sm"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Phone className="w-4 h-4 mr-2" />
                Contact Clinic
              </Button>

              </CardContent>
            </Card>
          ))}
      </div>
      {showModal && selectedClinic && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 w-[90%] max-w-md shadow-lg">
          <h3 className="text-lg font-bold mb-2">{selectedClinic.name}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {selectedClinic.address}
          </p>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Phone: </span>
              {selectedClinic.contact ? (
                <a href={`tel:${selectedClinic.contact}`} className="text-blue-600 underline">
                  {selectedClinic.contact}
                </a>
              ) : (
                "Not available"
              )}
            </div>
            <div>
              <span className="font-medium">Facebook: </span>
              {selectedClinic.facebook_page ? (
                <a
                  href={selectedClinic.facebook_page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {selectedClinic.facebook_page.replace(/^https?:\/\/(www\.)?facebook\.com\//, "")}
                </a>

              ) : (
                "Not available"
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </div>
    )}

      <Navigation />
    </div>
  );
};

export default VetFinder;
