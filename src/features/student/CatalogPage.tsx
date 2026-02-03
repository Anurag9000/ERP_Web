import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Clock, Users, MapPin } from 'lucide-react';
import { getDepartmentColor } from '../../lib/theme';
import { formatTime, getDayAbbreviation } from '../../lib/utils';

interface Section {
  id: string;
  section_number: string;
  capacity: number;
  enrolled_count: number;
  schedule_days: string[];
  start_time: string;
  end_time: string;
  status: string;
  courses: {
    code: string;
    name: string;
    description: string;
    credits: number;
    level: string;
    departments: {
      code: string;
      name: string;
      color: string;
    };
  };
  rooms: {
    code: string;
    name: string;
  } | null;
  user_profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Department {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export function CatalogPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [filteredSections, setFilteredSections] = useState<Section[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCatalogData = useCallback(async () => {
    try {
      const [sectionsData, departmentsData] = await Promise.all([
        supabase
          .from('sections')
          .select(`
            *,
            courses(
              code,
              name,
              description,
              credits,
              level,
              departments(code, name, color)
            ),
            rooms(code, name),
            user_profiles!sections_instructor_id_fkey(first_name, last_name)
          `)
          .eq('is_active', true)
          .order('courses(code)'),
        supabase
          .from('departments')
          .select('*')
          .eq('is_active', true)
          .order('name'),
      ]);

      setSections(sectionsData.data as any || []);
      setDepartments(departmentsData.data as Department[] || []);
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  useEffect(() => {
    applyFilters();
  }, [sections, searchQuery, selectedDepartment, selectedLevel, showOpenOnly]);

  function applyFilters() {
    let filtered = [...sections];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (section) =>
          section.courses.code.toLowerCase().includes(query) ||
          section.courses.name.toLowerCase().includes(query) ||
          section.courses.description?.toLowerCase().includes(query)
      );
    }

    if (selectedDepartment) {
      filtered = filtered.filter(
        (section) => section.courses.departments.code === selectedDepartment
      );
    }

    if (selectedLevel) {
      filtered = filtered.filter(
        (section) => section.courses.level === selectedLevel
      );
    }

    if (showOpenOnly) {
      filtered = filtered.filter(
        (section) => section.status === 'OPEN' && section.enrolled_count < section.capacity
      );
    }

    setFilteredSections(filtered);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading course catalog...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Course Catalog</h1>
        <p className="text-gray-600 mt-1">Browse and search for available courses</p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search courses by code, name, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.code}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showOpenOnly}
                  onChange={(e) => setShowOpenOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Show open sections only
                </span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      <div className="text-sm text-gray-600">
        Showing {filteredSections.length} of {sections.length} sections
      </div>

      <div className="space-y-4">
        {filteredSections.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No courses found matching your filters</p>
              <p className="text-sm text-gray-500 mt-2">Try adjusting your search criteria</p>
            </div>
          </Card>
        ) : (
          filteredSections.map((section) => (
            <Card
              key={section.id}
              color={getDepartmentColor(section.courses.departments.code)}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        {section.courses.code} - Section {section.section_number}
                      </h3>
                      <Badge color={getDepartmentColor(section.courses.departments.code)}>
                        {section.courses.departments.code}
                      </Badge>
                      <Badge variant={section.status === 'OPEN' ? 'success' : 'warning'}>
                        {section.status}
                      </Badge>
                    </div>
                    <p className="text-lg text-gray-700 mt-1">{section.courses.name}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      {section.courses.description}
                    </p>
                  </div>
                  <div className="ml-4">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={section.enrolled_count >= section.capacity}
                    >
                      {section.enrolled_count >= section.capacity ? 'Full' : 'Register'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-gray-900 font-medium">
                        {section.schedule_days.map(getDayAbbreviation).join(', ')}
                      </p>
                      <p className="text-gray-600">
                        {formatTime(section.start_time)} - {formatTime(section.end_time)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-gray-900 font-medium">
                        {section.rooms?.code || 'TBA'}
                      </p>
                      <p className="text-gray-600">{section.rooms?.name || 'To be announced'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-gray-900 font-medium">
                        {section.enrolled_count} / {section.capacity}
                      </p>
                      <p className="text-gray-600">Enrolled</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <div>
                      <p className="text-gray-900 font-medium">
                        {section.user_profiles
                          ? `${section.user_profiles.first_name} ${section.user_profiles.last_name}`
                          : 'TBA'}
                      </p>
                      <p className="text-gray-600">Instructor</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Badge variant="info">{section.courses.credits} Credits</Badge>
                  <Badge variant="default">Level {section.courses.level}</Badge>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
